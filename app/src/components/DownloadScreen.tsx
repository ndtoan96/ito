import { useEffect, useState } from "react";

type Props = {
    ticket: string;
    serverUrl: string;
};

const config: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
            ]
        },
    ]
};

export default function DownloadScreen({ ticket, serverUrl }: Props) {
    const [fileName, setFileName] = useState<string | null>(null);
    const id = Math.random().toString(36).substring(2, 10) + (new Date()).getTime().toString(36);
    useEffect(() => {
        const eventSource = new EventSource(`${serverUrl}/sse/${id}`);
        const pc = new RTCPeerConnection(config);
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("got candidate");
                fetch(`${serverUrl}/${ticket}`, {
                    method: "POST",
                    body: JSON.stringify({ candidate: event.candidate }),
                });
            }
        };
        pc.onconnectionstatechange = (_event) => {
            console.log(pc.connectionState);
        };
        pc.onnegotiationneeded = () => {
            pc.setLocalDescription().then(() => {
                fetch(`${serverUrl}/${ticket}`, {
                    method: "POST",
                    body: JSON.stringify({ from: id, offer: pc.localDescription }),
                });
            });
        };
        pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            fetch(`${serverUrl}/${ticket}`, {
                method: "POST",
                body: JSON.stringify({ from: id, offer: offer }),
            });

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.answer && data.fileName) {
                    setFileName(data.fileName);
                    console.log("got answer");
                    pc.setRemoteDescription(data.answer).then(() => {
                        let channel = pc.createDataChannel("download-channel");
                        channel.onopen = () => {
                            console.log("data channel open");
                        };
                        channel.onmessage = (event) => {
                            const blob = new Blob([event.data], { type: "application/octet-stream" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = data.fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                        };
                    });
                }
                if (data.candidate) {
                    pc.addIceCandidate(data.candidate);
                }
            };
        });
    }, []);
    return (
        <div>
            <h1>Download {fileName ? fileName : ticket}</h1>
        </div>
    );
}