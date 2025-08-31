"use client";

import { useState } from "react";

export default function Home() {
  const [textData, setTextData] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");

  const handleUpload = async () => {
    const formData = new FormData();
    if (textData) formData.append("text", textData);
    if (url) formData.append("url", url);
    if (file) formData.append("file", file);

    await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    console.log("Data uploaded & indexed!");
  };

  const handleChat = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      { role: "ai", content: data.answer },
    ]);
    setQuery("");
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-1/3 p-4 border-r overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Data Source</h2>
        <textarea
          className="w-full h-7/12 border p-2 mb-2"
          placeholder="Enter text..."
          value={textData}
          onChange={(e) => setTextData(e.target.value)}
        />
        <input
          className="w-full border p-2 mb-2"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <input
          className="w-full border p-2 mb-2"
          type="text"
          placeholder="Enter website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white p-2 rounded w-full"
        >
          Submit
        </button>
      </div>

      {/* Right Panel */}
      <div className="w-2/3 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-2">Chat</h2>
        <div className="flex-1 border p-2 mb-2 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-2 ${
                msg.role === "user" ? "text-blue-600" : "text-green-600"
              }`}
            >
              <b>{msg.role}:</b> {msg.content}
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            className="flex-1 border p-2"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={handleChat}
            className="bg-green-500 text-white p-2 rounded ml-2"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
