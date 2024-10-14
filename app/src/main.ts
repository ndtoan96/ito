import "./style.css";

function humanReadableSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${Math.round(bytes * 100) / 100} ${sizes[i]}`;
}

function stripTrailingSlash(str: string): string {
  return str.replace(/\/$/, "");
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

let id = generateId();

let serverUrl = stripTrailingSlash(
  document.querySelector<HTMLInputElement>("#server-input")!.value,
);

const spanServerStatus = document.querySelector<HTMLSpanElement>(
  "#server-status",
)!;
let eventSource: EventSource;
async function connectServer() {
  id = generateId();
  if (eventSource) {
    eventSource.close();
  }
  spanServerStatus.innerHTML = "Connecting...";
  spanServerStatus.className = "";
  eventSource = new EventSource(
    serverUrl + "/sse/" +
      id,
  );
  eventSource.onerror = (event) => {
    console.error("EventSource error:", event);
    spanServerStatus.innerHTML = "Server is dead";
    spanServerStatus.className = "server-dead";
    eventSource.close();
  };
  eventSource.onopen = (_) => {
    spanServerStatus.innerHTML = "Server is alive";
    spanServerStatus.className = "server-alive";
  };
}

document.querySelector<HTMLInputElement>("#server-input")!.onchange = (
  event,
) => {
  serverUrl = stripTrailingSlash((event.target! as HTMLInputElement).value);
};

const CHUNK_SIZE = 1024 * 200;

const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
  ],
});

document.querySelector<HTMLButtonElement>("#connect-button")!.onclick =
  connectServer;
connectServer();

document.querySelector<HTMLInputElement>("#file-input")?.addEventListener(
  "change",
  async (event) => {
    const inputFile = event.target as HTMLInputElement;
    document.querySelector<HTMLSpanElement>("#file-size")!.innerHTML =
      humanReadableSize(
        inputFile.files![0].size,
      );
    document.querySelector<HTMLSpanElement>("#ticket")!.innerHTML =
      `Download ticket: <span class="code">${id}</span>`;
    document.querySelector<HTMLInputElement>("#ticket-input")!.hidden = true;
    document.querySelector<HTMLButtonElement>("#download-button")!.hidden =
      true;
    sendFile(inputFile.files![0]);
  },
);

document.querySelector<HTMLInputElement>("#download-button")?.addEventListener(
  "click",
  async (_) => {
    const ticketInput = document.querySelector<HTMLInputElement>(
      "#ticket-input",
    ) as HTMLInputElement;
    if (ticketInput.value) {
      await downloadTicket(ticketInput.value);
    }
  },
);

const sendStatusDiv = document.querySelector<HTMLDivElement>("#send-status")!;
const downloadStatusDiv = document.querySelector<HTMLDivElement>(
  "#download-status",
)!;

function sendFile(file: File) {
  const pSendStatus = document.createElement("p");
  sendStatusDiv.appendChild(pSendStatus);
  eventSource.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    let peerId: string | null = null;
    if (data.from) {
      peerId = data.from;
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch(
            serverUrl +
              "/" +
              peerId,
            {
              method: "POST",
              body: JSON.stringify({ candidate: event.candidate }),
            },
          );
        }
      };

      pc.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onopen = () => {
          const fileReader = new FileReader();
          let offset = 0;
          fileReader.onload = () => {
            channel.send(fileReader.result as ArrayBuffer);
            offset += CHUNK_SIZE;
            pSendStatus.innerText = `Sent: ${
              (offset / file.size * 100).toFixed(2)
            }%`;
          };
          channel.onbufferedamountlow = () => {
            if (offset < file.size) {
              fileReader.readAsArrayBuffer(
                file.slice(offset, offset + CHUNK_SIZE),
              );
            } else {
              channel.close();
            }
          };
          fileReader.readAsArrayBuffer(
            file.slice(offset, offset + CHUNK_SIZE),
          );
        };
      };
    }

    if (data.offer) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(
        serverUrl + "/" +
          peerId,
        {
          method: "POST",
          body: JSON.stringify({
            answer,
            fileName: file.name,
            fileSize: file.size,
          }),
        },
      );
    }
  };
}

async function downloadTicket(ticket: string) {
  const startTime = Date.now();
  const pDownloadStatus = document.createElement("p");
  const pSpeed = document.createElement("p");
  downloadStatusDiv.appendChild(pDownloadStatus);
  downloadStatusDiv.appendChild(pSpeed);
  let fileName = "download";
  let fileSize = 0;
  let downloadedSize = 0;
  pc.onnegotiationneeded = async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await fetch(
      serverUrl + "/" +
        ticket,
      {
        method: "POST",
        body: JSON.stringify({ offer, from: id }),
      },
    );
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      fetch(
        document.querySelector<HTMLInputElement>("#server-input")!.value + "/" +
          ticket,
        {
          method: "POST",
          body: JSON.stringify({ candidate: event.candidate }),
        },
      );
    }
  };

  eventSource.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.candidate) {
      await pc.addIceCandidate(data.candidate);
    }
    if (data.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    if (data.fileName) {
      fileName = data.fileName;
    }
    if (data.fileSize) {
      fileSize = data.fileSize;
    }
  };

  const channel = pc.createDataChannel("channel");
  const fileData: ArrayBuffer[] = [];
  channel.onmessage = (event) => {
    fileData.push(event.data);
    downloadedSize += event.data.byteLength;
    const deltaTimeSecs = (Date.now() - startTime) / 1000;
    pDownloadStatus.innerText = `Downloaded: ${
      (downloadedSize / fileSize * 100).toFixed(2)
    }% (${humanReadableSize(downloadedSize)} / ${
      humanReadableSize(
        fileSize,
      )
    })`;
    pSpeed.innerText = `Speed: ${
      humanReadableSize(downloadedSize / deltaTimeSecs)
    }/s`;
  };
  channel.onclose = () => {
    if (fileData.length * CHUNK_SIZE >= fileSize) {
      const file = new Blob(fileData, { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
    } else {
      pDownloadStatus.innerText += ". Download failed";
      pDownloadStatus.style.color = "red";
    }
  };
}
