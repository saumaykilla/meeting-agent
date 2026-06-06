"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

const CURRENT_USER = { id: 1, name: "Sarah Johnson" };

const MOCK_MESSAGES = [
  {
    id: 1,
    senderId: 2,
    senderName: "James Lee",
    content: "Hey team, should we kick off with last week's blockers?",
    sentAt: new Date(Date.now() - 3600000).toISOString(),
    isAgent: false,
  },
  {
    id: 2,
    senderId: 1,
    senderName: "Sarah Johnson",
    content: "Sounds good. I'll share my screen in a sec.",
    sentAt: new Date(Date.now() - 3500000).toISOString(),
    isAgent: false,
  },
  {
    id: 3,
    senderId: 0,
    senderName: "CC Assistant",
    content: "I noticed this topic was discussed on June 3rd. The team decided to move the API migration to Q4 to unblock the mobile release.",
    sentAt: new Date(Date.now() - 3400000).toISOString(),
    isAgent: true,
  },
  {
    id: 4,
    senderId: 3,
    senderName: "Maria Chen",
    content: "Thanks CC! Yes, that's still the plan.",
    sentAt: new Date(Date.now() - 3300000).toISOString(),
    isAgent: false,
  },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChannelPage({ params }: { params: { channelId: string } }) {
  const channelName = "general";
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const msg = {
      id: messages.length + 1,
      senderId: CURRENT_USER.id,
      senderName: CURRENT_USER.name,
      content: input.trim(),
      sentAt: new Date().toISOString(),
      isAgent: false,
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>
          #{channelName}
        </span>
        <span style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
          · 5 members
        </span>
      </div>

      {/* Messages */}
      <div className="chat-body">
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const isConsecutive =
            prev &&
            prev.senderId === msg.senderId &&
            !msg.isAgent &&
            !prev.isAgent &&
            new Date(msg.sentAt).getTime() - new Date(prev.sentAt).getTime() < 5 * 60 * 1000;

          if (msg.isAgent) {
            return (
              <div key={msg.id} className="message-agent" style={{ margin: "8px 0" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Avatar name="CC" isAgent size="sm" />
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-semibold)",
                      color: "var(--color-agent-text)",
                    }}
                  >
                    CC Assistant
                  </span>
                  <span className="message-timestamp" style={{ opacity: 1 }}>
                    {formatTime(msg.sentAt)}
                  </span>
                </div>
                <p className="message-content">{msg.content}</p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`message-group ${isConsecutive ? "message-continued" : ""}`}
              style={{ paddingLeft: isConsecutive ? 44 : 0 }}
            >
              {!isConsecutive && (
                <div className="message-avatar-col">
                  <Avatar name={msg.senderName} size="md" />
                </div>
              )}
              <div className="message-body">
                {!isConsecutive && (
                  <div className="message-meta">
                    <span className="message-sender">{msg.senderName}</span>
                    <span className="message-timestamp">{formatTime(msg.sentAt)}</span>
                  </div>
                )}
                <p className="message-content">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-footer">
        <div className="message-input-wrapper">
          <textarea
            className="message-input"
            placeholder={`Message #${channelName}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
        </div>
      </div>
    </div>
  );
}
