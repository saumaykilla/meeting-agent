"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message, User } from "@/lib/spacetimedb-types/types";

export default function ChannelPage(props: { params: Promise<{ channelId: string }> }) {
  const params = use(props.params);
  const { user, db } = useAuth();
  
  const channelIdNum = BigInt(params.channelId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Map<bigint, User>>(new Map());
  const [channelName, setChannelName] = useState("");

  useEffect(() => {
    if (!db || !user) return;

    const updateChannelName = () => {
      let foundChannelName = "unknown";
      for (const c of db.db.channel.iter()) {
        if (c.id === channelIdNum) {
          foundChannelName = c.name;
          break;
        }
      }
      setChannelName(foundChannelName);
    };

    updateChannelName();

    // Build user map
    const updateUsers = () => {
      const uMap = new Map<bigint, User>();
      for (const u of db.db.user.iter()) {
        uMap.set(u.id, u);
      }
      setUsers(uMap);
    };

    // Load messages
    const updateMessages = () => {
      const allMsgs = Array.from(db.db.message.iter()).filter(
        (m) => m.channelType === "Channel" && m.channelId === channelIdNum
      );
      // Sort by sentAt
      allMsgs.sort((a, b) => Number(a.sentAt) - Number(b.sentAt));
      setMessages(allMsgs);
    };

    updateUsers();
    updateMessages();

    // Subscribe to updates
    db.db.user.onInsert(updateUsers);
    db.db.user.onUpdate(updateUsers);
    db.db.user.onDelete(updateUsers);

    db.db.channel.onInsert(updateChannelName);
    db.db.channel.onUpdate(updateChannelName);
    db.db.channel.onDelete(updateChannelName);

    db.db.message.onInsert(updateMessages);
    db.db.message.onUpdate(updateMessages);
    db.db.message.onDelete(updateMessages);

    return () => {
      db.db.user.removeOnInsert(updateUsers);
      db.db.user.removeOnUpdate(updateUsers);
      db.db.user.removeOnDelete(updateUsers);
      db.db.channel.removeOnInsert(updateChannelName);
      db.db.channel.removeOnUpdate(updateChannelName);
      db.db.channel.removeOnDelete(updateChannelName);
      db.db.message.removeOnInsert(updateMessages);
      db.db.message.removeOnUpdate(updateMessages);
      db.db.message.removeOnDelete(updateMessages);
    };

  }, [db, user, channelIdNum]);

  useEffect(() => {
    if (messages.length === 0) return;
    const latestId = messages[messages.length - 1]?.id;
    if (!latestId) return;
    localStorage.setItem(`cc_last_seen_Channel_${channelIdNum.toString()}`, latestId.toString());
    window.dispatchEvent(new Event("cc:read-state-change"));
  }, [messages, channelIdNum]);

  async function handleSendMessage(content: string) {
    if (!db || !user) return;
    try {
      await db.reducers.sendMessage({
        content,
        channelType: "Channel",
        channelId: channelIdNum,
      });
    } catch (e) {
      console.error("Failed to send message", e);
    }
  }

  if (!user) return null;

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>
          #{channelName}
        </span>
      </div>

      <MessageList
        messages={messages}
        users={users}
        currentUser={user}
        emptyText="No messages yet. Start the conversation!"
      />

      {/* Input */}
      <div className="chat-footer">
        <MessageInput 
          placeholder={`Message #${channelName}`} 
          onSend={handleSendMessage} 
        />
      </div>
    </div>
  );
}
