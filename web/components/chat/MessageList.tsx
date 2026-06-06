"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { Message, User } from "@/lib/spacetimedb-types/types";

interface MessageListProps {
  messages: Message[];
  users: Map<bigint, User>;
  currentUser: User;
  emptyText: string;
}

function dayLabel(value: bigint | number | string) {
  const date = new Date(Number(value));
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessageList({ messages, users, currentUser, emptyText }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasNearBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (wasNearBottom.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="chat-body"
      onScroll={(event) => {
        const el = event.currentTarget;
        wasNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
      }}
    >
      {messages.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 40, color: "var(--color-muted)" }}>
          <p>{emptyText}</p>
        </div>
      )}

      {messages.map((message, index) => {
        const prev = messages[index - 1];
        const showDate = !prev || new Date(Number(prev.sentAt)).toDateString() !== new Date(Number(message.sentAt)).toDateString();
        const isConsecutive =
          prev &&
          prev.senderId === message.senderId &&
          !message.isAgentMessage &&
          !prev.isAgentMessage &&
          Number(message.sentAt) - Number(prev.sentAt) < 5 * 60 * 1000;
        const sender = message.isAgentMessage ? null : users.get(message.senderId) || null;

        return (
          <div key={message.id.toString()}>
            {showDate && <div className="date-divider">{dayLabel(message.sentAt)}</div>}
            <MessageBubble
              message={message}
              sender={sender}
              showAvatar={!isConsecutive}
              isOwn={message.senderId === currentUser.id}
            />
          </div>
        );
      })}
    </div>
  );
}
