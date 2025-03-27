"use client";
import React, { useState, useRef, useEffect, JSX } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const MarkmapMindmap = dynamic(() => import("../components/MarkmapMindmap"), {
  ssr: false,
});

export default function Home(): JSX.Element {
  const [prompt, setPrompt] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [mindmap, setMindmap] = useState<string>("");
  const [originalMindmap, setOriginalMindmap] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Generate a new mindmap (start over)
  const handleGenerate = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const newMindmap = data.markdown || "";
      setMindmap(newMindmap);
      setOriginalMindmap(newMindmap);
      setEditPrompt("");
    } catch (error) {
      console.error("Error generating mindmap:", error);
    }
    setLoading(false);
  };

  // Update the existing mindmap (edit) while preserving the old mindmap under a loading overlay
  // In page.tsx (Home page)
const handleUpdateMindmap = async (): Promise<void> => {
  // Set a timeout so that the loading overlay only appears if the update takes longer than 300ms.
  const loadingTimeout = setTimeout(() => setLoading(true), 30000);

  try {
    const res = await fetch("/api/ollama/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mindmap: originalMindmap, prompt: editPrompt }),
    });
    const data = await res.json();
    // If the returned markdown contains extra metadata, only use the "response" field.
    let updatedMindmap = data.markdown || originalMindmap;
    try {
      const parsed = JSON.parse(updatedMindmap);
      if (parsed.response) {
        updatedMindmap = parsed.response;
      }
    } catch (err) {
      // If parsing fails, assume the returned string is already the markdown.
    }
    setMindmap(updatedMindmap);
    setOriginalMindmap(updatedMindmap);
    setEditPrompt("");
  } catch (error) {
    console.error("Error editing mindmap:", error);
  }
  clearTimeout(loadingTimeout);
  setLoading(false);
};


  // Reset all fields to start over with a new mindmap
  const handleStartOver = (): void => {
    setMindmap("");
    setOriginalMindmap("");
    setPrompt("");
    setEditPrompt("");
  };

  // Open the chat page with the current mindmap
  const handleChatWithMindmap = (): void => {
    const encoded = encodeURIComponent(mindmap);
    window.open(`/mindmap-chat?mindmap=${encoded}`, "_blank");
  };

  // Resizable divider logic
  const handleMouseDown = (): void => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth =
      ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newLeftWidth < 10) {
      setLeftWidth(10);
    } else if (newLeftWidth > 90) {
      setLeftWidth(90);
    } else {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = (): void => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="min-h-screen flex">
      {/* Left Pane: Mindmap visualization */}
      <div
        style={{ width: `${leftWidth}%` }}
        className="border-r border-gray-300 overflow-auto relative"
      >
        {mindmap && <MarkmapMindmap markdown={mindmap} />}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80">
          <svg viewBox="0 0 400 400" className="w-64 h-64">
            {/* Translate the coordinate system so that the center is at (0,0) */}
            <g transform="translate(200,200)">
              {/* Outer group to handle scaling animation */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.1;1"
                  keyTimes="0;0.5;1"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
                {/* Inner group to handle rotation animation */}
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to="360"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                  {/* Central Node */}
                  <circle cx="0" cy="0" r="20" fill="#3B82F6" />
    
                  {/* Outer Node 1 (Top) */}
                  <line x1="0" y1="0" x2="0" y2="0" stroke="#F87171" strokeWidth="2">
                    <animate
                      attributeName="y2"
                      values="0;-100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                  </line>
                  <circle cx="0" cy="0" r="15" fill="#F87171">
                    <animate
                      attributeName="cy"
                      values="0;-100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                  </circle>
    
                  {/* Outer Node 2 (Right) */}
                  <line x1="0" y1="0" x2="0" y2="0" stroke="#10B981" strokeWidth="2">
                    <animate
                      attributeName="x2"
                      values="0;100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.2s"
                      repeatCount="indefinite"
                    />
                  </line>
                  <circle cx="0" cy="0" r="15" fill="#10B981">
                    <animate
                      attributeName="cx"
                      values="0;100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
    
                  {/* Outer Node 3 (Bottom) */}
                  <line x1="0" y1="0" x2="0" y2="0" stroke="#F59E0B" strokeWidth="2">
                    <animate
                      attributeName="y2"
                      values="0;100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.4s"
                      repeatCount="indefinite"
                    />
                  </line>
                  <circle cx="0" cy="0" r="15" fill="#F59E0B">
                    <animate
                      attributeName="cy"
                      values="0;100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
    
                  {/* Outer Node 4 (Left) */}
                  <line x1="0" y1="0" x2="0" y2="0" stroke="#8B5CF6" strokeWidth="2">
                    <animate
                      attributeName="x2"
                      values="0;-100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.6s"
                      repeatCount="indefinite"
                    />
                  </line>
                  <circle cx="0" cy="0" r="15" fill="#8B5CF6">
                    <animate
                      attributeName="cx"
                      values="0;-100;0"
                      keyTimes="0;0.5;1"
                      dur="1.6s"
                      begin="0.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              </g>
            </g>
          </svg>
          <span className="mt-4 text-xl text-gray-700">
  Creating Mindmap<span className="dot-anim">.</span>
</span>
        </div>
        )}
      </div>

      {/* Draggable Divider */}
      <div
        className="w-[4px] cursor-col-resize bg-gray-300"
        onMouseDown={handleMouseDown}
      ></div>

      {/* Right Pane: Controls */}
      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="overflow-auto p-4"
      >
        <h1 className="text-3xl font-bold mb-4">Mindmap Generator</h1>
        {mindmap ? (
          <>
            <div className="w-full mb-4">
              <label className="block font-semibold mb-2">
                Current Mindmap (Markdown):
              </label>
              <textarea
                className="w-full h-48 p-2 border border-gray-300 rounded mb-4"
                value={mindmap}
                readOnly
              />
            </div>
            <div className="w-full mb-6">
              <label className="block font-semibold mb-2">
                Edit Mindmap (Describe changes you want):
              </label>
              <textarea
                className="w-full h-24 p-2 border border-gray-300 rounded mb-4"
                placeholder="E.g. Add a new node about concurrency..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
              />
              <button
                type="button"
                onClick={handleUpdateMindmap}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 mb-2"
              >
                Update Mindmap
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
              >
                Start Over & Generate New Mindmap
              </button>
            </div>
            <button
              onClick={handleChatWithMindmap}
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
            >
              Chat with Mindmap
            </button>
          </>
        ) : (
          <form onSubmit={handleGenerate} className="w-full mb-6">
            <textarea
              className="w-full p-2 border border-gray-300 rounded mb-4"
              placeholder="Enter your initial prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Generate Mindmap
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
