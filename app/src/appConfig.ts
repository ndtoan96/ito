export default {
    defaultServerUrl: "http://localhost:8000",
    rtcConfig: {
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                ],
            },
        ],
    },
    chunkSize: 100 * 1024, // 100KB
};
