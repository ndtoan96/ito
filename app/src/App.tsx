import { useState } from "react";
import SharedFile from "./components/SharedFile";
import DropZone from "./components/DropZone";
import IdInput from "./components/IdInput";
import SignalingServerInput from "./components/SignalingServerInput";
import DownloadScreen from "./components/DownloadScreen";
import config from './appConfig.ts';



export default function App() {
  const [signalingUrl, setSignalingUrl] = useState(config.defaultServerUrl);
  const [file, setFile] = useState<File | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  return (
    <div className="App">
      {file === null && ticket === null ? <SignalingServerInput url={signalingUrl} setUrl={setSignalingUrl} /> : null}
      {file ? <SharedFile file={file} serverUrl={signalingUrl} /> : ticket !== null ? <DownloadScreen serverUrl={signalingUrl} ticket={ticket} /> : <><DropZone onNewFile={setFile} /><IdInput onClick={setTicket} /></>}
    </div>
  );
}