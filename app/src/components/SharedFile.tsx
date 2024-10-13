import { useEffect } from "react";

type Props = {
    file: File;
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

export default function SharedFile({ file, serverUrl }: Props) {
    const id = Math.random().toString(36).substring(2, 10) + (new Date()).getTime().toString(36);

    useEffect(() => {
        const eventSource = new EventSource(`${serverUrl}/sse/${id}`);
        let peerId: string | null = null;
        const pc = new RTCPeerConnection(config);
        pc.onconnectionstatechange = (_event) => {
            console.log(pc.connectionState);
        };
        pc.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onopen = () => {
                console.log("data channel open");
                const reader = new FileReader();
                reader.onload = () => {
                    channel.send(reader.result as ArrayBuffer);
                };
                reader.readAsArrayBuffer(file);
            };
        };
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.from) {
                peerId = data.from;
            }
            if (data.offer) {
                pc.setRemoteDescription(data.offer).then(() => {
                    return pc.createAnswer();
                }).then((answer) => {
                    pc.setLocalDescription(answer);
                    fetch(`${serverUrl}/${peerId}`, {
                        method: "POST",
                        body: JSON.stringify({ answer: answer, fileName: file.name, fileSize: file.size }),
                    });
                });
            }
            if (data.candidate) {
                pc.addIceCandidate(data.candidate);
            }
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    fetch(`${serverUrl}/${peerId}`, {
                        method: "POST",
                        body: JSON.stringify({ candidate: event.candidate }),
                    });
                }
            };
        };
    }, []);

    return (
        <div className="flex flex-col">
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="50" height="50">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" fill="#2196f3" />
                    <path d="M14 2v6h6" fill="#90caf9" />
                    <path d="M8 13h8v2H8zm0 4h8v2H8z" fill="#fff" />
                </svg>
                <span>{file.name}</span>
            </div>
            <div className="text-xs text-gray-500">
                {file.size < 1048576 ?
                    `${(file.size / 1024).toFixed(2)} KB`
                    :
                    file.size < 1073741824 ?
                        `${(file.size / 1048576).toFixed(2)} MB`
                        :
                        `${(file.size / 1073741824).toFixed(2)} GB`
                }
            </div>
            <div className="text-xs text-gray-500">
                <b>Download ticket</b>: <span className="font-mono bg-gray-200 px-1 rounded">{id}</span>
            </div>
        </div>
    );
}