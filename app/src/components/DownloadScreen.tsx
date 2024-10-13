import { useEffect, useState } from "react";
import config from "../appConfig.ts";

type Props = {
    ticket: string;
    serverUrl: string;
};



let globalFileName: string | null = null;

export default function DownloadScreen({ ticket, serverUrl }: Props) {
    const [fileName, setFileName] = useState<string | null>(null);
    const id = Math.random().toString(36).substring(2, 10) + (new Date()).getTime().toString(36);
    useEffect(() => {
        const eventSource = new EventSource(`${serverUrl}/sse/${id}`);
        const pc = new RTCPeerConnection(config.rtcConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                fetch(`${serverUrl}/${ticket}`, {
                    method: "POST",
                    body: JSON.stringify({ candidate: event.candidate }),
                });
            }
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
                pc.setRemoteDescription(data.answer);
            }
            if (data.candidate) {
                pc.addIceCandidate(data.candidate);
            }
        };

        let channel = pc.createDataChannel("download-channel");
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