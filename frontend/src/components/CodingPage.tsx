import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";
import { Editor } from "./Editor";
import { File, RemoteFile, Type } from "./external/editor/utils/file-manager";
import { useSearchParams } from "react-router-dom";
import { Output } from "./Output";
import { TerminalComponent as Terminal } from "./Terminal";
import "tailwindcss/tailwind.css"; // Ensure you're using Tailwind CSS

function useSocket(replId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(`ws://${replId}.localhost`, {
      query: { replId },
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [replId]);

  return socket;
}

export const CodingPage = () => {
  const [searchParams] = useSearchParams();
  const replId = searchParams.get("replId") ?? "";
  const [loaded, setLoaded] = useState(false);
  const socket = useSocket(replId);
  const [fileStructure, setFileStructure] = useState<RemoteFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [showOutput, setShowOutput] = useState(false);
  const [port, setPort] = useState(3000);

  useEffect(() => {
    if (socket) {
      socket.on("loaded", ({ rootContent }: { rootContent: RemoteFile[] }) => {
        setLoaded(true);
        setFileStructure(rootContent);
      });
    }
  }, [socket]);

  const onSelect = (file: File) => {
    if (file.type === Type.DIRECTORY) {
      socket?.emit("fetchDir", file.path, (data: RemoteFile[]) => {
        setFileStructure((prev) => {
          const allFiles = [...prev, ...data];
          return allFiles.filter(
            (file, index, self) =>
              index === self.findIndex((f) => f.path === file.path)
          );
        });
      });
    } else {
      socket?.emit("fetchContent", { path: file.path }, (data: string) => {
        file.content = data;
        setSelectedFile(file);
      });
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    const parsed = parseInt(val);
    if (!Number.isNaN(parsed)) {
      setPort(parsed);
    }
  };

  if (!loaded) {
    return "Loading...";
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with input and button */}
      <div className="w-full flex justify-end items-center p-4 bg-gray-800 text-white">
        <input
          type="number"
          value={port}
          onChange={handleChange}
          className="text-black px-2 py-1 border border-gray-300 rounded"
        />
        <button
          type="button"
          onClick={() => setShowOutput(!showOutput)}
          className="ml-2 px-4 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white"
        >
          {showOutput ? "Hide Output" : "Show Output"}
        </button>
      </div>

      {/* Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 h-full overflow-auto">
          <Editor
            socket={socket}
            selectedFile={selectedFile}
            onSelect={onSelect}
            files={fileStructure}
          />
        </div>

        {showOutput && (
          <div className="flex-1 h-full bg-gray-100 overflow-auto">
            <Output replId={replId} port={port} />
          </div>
        )}
      </div>

      {/* Terminal at the bottom */}
      <div className="w-full h-1/3 bg-gray-900 text-white overflow-scroll">
        <Terminal socket={socket} />
      </div>
    </div>
  );
};
