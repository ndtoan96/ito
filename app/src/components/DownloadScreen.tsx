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

let globalFileName: string | null = null;

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
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.fileName) {
                setFileName(data.fileName);
                globalFileName = data.fileName;
            }
            if (data.answer) {
                setFileName(data.fileName);
                console.log("got answer");
                pc.setRemoteDescription(data.answer);
            }
            if (data.candidate) {
                pc.addIceCandidate(data.candidate);
            }
        };

        let channel = pc.createDataChannel("download-channel");
        channel.onopen = () => {
            console.log("data channel open");
        };
        channel.onmessage = (event) => {
            const blob = new Blob([event.data], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = globalFileName!;
            a.click();
            URL.revokeObjectURL(url);
        };
    }, []);
    return (
        <div>
            <h1>Download {fileName ? fileName : ticket}</h1>
        </div>
    );
}