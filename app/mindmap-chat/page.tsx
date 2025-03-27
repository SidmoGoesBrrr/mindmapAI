"use client";
import React, { useState, useRef, useEffect, KeyboardEvent, JSX, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";

// Dynamically import the MindmapChatWithSearchParams component.
const MindmapChatWithSearchParams = dynamic(() => import("../../components/MindmapChatWithSearchParams"), {
  ssr: false,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function MindmapChatPage(): JSX.Element {
  const [mindmap, setMindmap] = useState<string>("");

  // Use the MindmapChatWithSearchParams component to get the mindmap query param.
  useEffect(() => {
    const fetchMindmap = async () => {
      const res = await fetch("/api/mindmap");
      const data = await res.json();
      setMindmap(data.mindmap || "");
    };

    fetchMindmap();
  }, []);

  const systemPrompt = `You are an assistant who can answer the questions based on the following mindmap:\n\n${mindmap}`;

  // Chat conversation messages.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState<string>("");
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resizable pane states.
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newLeftWidth < 10) newLeftWidth = 10;
    if (newLeftWidth > 90) newLeftWidth = 90;
    setLeftWidth(newLeftWidth);
  }, [isResizing]);

  const handleMouseUp = () => {
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
  }, [isResizing, handleMouseMove]);

  const handleSend = async () => {
    if (!userMessage.trim()) return;

    const newUserMsg: ChatMessage = { role: "user", content: userMessage.trim() };
    setMessages((prev) => [...prev, newUserMsg]);
    setUserMessage("");
    setStreamingResponse("");
    setIsStreaming(true);

    // Build conversation with system context.
    const conversation = [{ role: "system", content: systemPrompt }, ...messages, newUserMsg];

    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) {
        const fallback = await res.json();
        const fallbackMsg: ChatMessage = {
          role: "assistant",
          content: fallback.response || "No response",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        // Do not update mindmap here in chat mode.
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  accumulated += parsed.response;
                  setStreamingResponse(accumulated);
                }
              } catch (error) {
                console.error("Error parsing chunk:", error);
              }
            }
          }
        }
      }

      setIsStreaming(false);
      const assistantMsg: ChatMessage = { role: "assistant", content: accumulated };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Streaming aborted");
      } else {
        console.error("Error streaming chat:", error);
      }
      setIsStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div ref={containerRef} className="flex h-screen p-4">
        <div style={{ width: `${leftWidth}%` }} className="border-r border-gray-300 relative">
          <MindmapChatWithSearchParams />
        </div>
        <div className="w-[4px] cursor-col-resize bg-gray-300" onMouseDown={handleMouseDown}></div>
        <div style={{ width: `${100 - leftWidth}%` }} className="flex flex-col">
          <div className="flex-1 border p-4 overflow-y-auto space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-2 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-2 rounded-lg bg-gray-200 text-black">
                  <ReactMarkdown>{streamingResponse}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
          <div className="flex">
            <textarea
              className="flex-1 border p-2 rounded mr-2"
              rows={3}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
            />
            {isStreaming ? (
              <button onClick={handleStop} className="bg-red-500 p-2 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            ) : (
              <button onClick={handleSend} className="bg-blue-500 p-2 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
