"use client";

import { useState } from "react";

interface MessageInputProps {
  placeholder: string;
  onSend: (content: string) => void;
}

const MAX_LENGTH = 4000;

export function MessageInput({ placeholder, onSend }: MessageInputProps) {
  const [input, setInput] = useState("");

  function sendMessage() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="message-input-wrapper">
      <textarea
        className="message-input"
        placeholder={placeholder}
        value={input}
        maxLength={MAX_LENGTH}
        onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{
          height: "auto",
          minHeight: "36px",
        }}
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement;
          t.style.height = "auto";
          t.style.height = Math.min(t.scrollHeight, 120) + "px";
        }}
      />
      <button
        className="message-send-btn"
        onClick={sendMessage}
        disabled={!input.trim()}
        aria-label="Send message"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7l12-5.5L7 13 6.5 8 1 7z" fill="currentColor" />
        </svg>
      </button>
      <span
        style={{
          position: "absolute",
          right: 46,
          bottom: 7,
          fontSize: "10px",
          color: input.length > MAX_LENGTH - 200 ? "var(--color-warning)" : "var(--color-muted)",
        }}
      >
        {input.length > MAX_LENGTH - 500 ? `${input.length}/${MAX_LENGTH}` : ""}
      </span>
    </div>
  );
}
