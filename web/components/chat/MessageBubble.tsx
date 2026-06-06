"use client";

import { User, Message } from "@/lib/spacetimedb-types/types";
import { Avatar } from "@/components/ui/Avatar";
import { AgentMessageCard } from "@/components/chat/AgentMessageCard";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

interface MessageBubbleProps {
  message: Message;
  sender: User | null; // null for CC Assistant or deleted user
  showAvatar: boolean;
  isOwn: boolean;
}

function formatTime(value: bigint | number | string) {
  return new Date(Number(value)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, sender, showAvatar, isOwn }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  if (message.isAgentMessage) {
    return <AgentMessageCard message={message} />;
  }

  const senderName = sender ? sender.displayName : "Unknown User";

  return (
    <div
      className={`message-group ${isOwn ? "message-own" : ""} ${!showAvatar ? "message-continued" : ""}`}
      data-own={isOwn}
      style={{ paddingLeft: !showAvatar ? 44 : 0 }}
    >
      {showAvatar && (
        <div className="message-avatar-col">
          <Avatar name={senderName} size="md" />
        </div>
      )}
      <div className="message-body">
        {showAvatar && (
          <div className="message-meta">
            <span className="message-sender">{senderName}</span>
            <span className="message-timestamp">{formatTime(message.sentAt)}</span>
          </div>
        )}
        <div
          className="message-content"
          style={
            expanded
              ? undefined
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: 10,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
          }
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {message.content.split(/\r?\n/).length > 10 || message.content.length > 900 ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ padding: "2px 0", marginTop: 2 }}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
