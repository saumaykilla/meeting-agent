"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message, User, DmConversation } from "@/lib/spacetimedb-types/types";

export default function DirectMessagePage(props: { params: Promise<{ userId: string }> }) {
  const params = use(props.params);
  const { user, db } = useAuth();
  
  const otherUserId = BigInt(params.userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<DmConversation | null>(null);

  useEffect(() => {
    if (!db || !user) return;

    const updateOtherUser = () => {
      let foundOther = null;
      for (const u of db.db.user.iter()) {
        if (u.id === otherUserId) {
          foundOther = u;
          break;
        }
      }
      setOtherUser(foundOther);
    };

    updateOtherUser();

    // Load or find conversation
    const updateConversation = () => {
      let foundConv = null;
      for (const c of db.db.dmConversation.iter()) {
        if (
          (c.userAId === user.id && c.userBId === otherUserId) ||
          (c.userAId === otherUserId && c.userBId === user.id)
        ) {
          foundConv = c;
          break;
        }
      }
      setConversation(foundConv);
    };

    updateConversation();

    db.db.dmConversation.onInsert(updateConversation);
    db.db.dmConversation.onUpdate(updateConversation);
    db.db.dmConversation.onDelete(updateConversation);

    db.db.user.onInsert(updateOtherUser);
    db.db.user.onUpdate(updateOtherUser);
    db.db.user.onDelete(updateOtherUser);

    return () => {
      db.db.dmConversation.removeOnInsert(updateConversation);
      db.db.dmConversation.removeOnUpdate(updateConversation);
      db.db.dmConversation.removeOnDelete(updateConversation);
      db.db.user.removeOnInsert(updateOtherUser);
      db.db.user.removeOnUpdate(updateOtherUser);
      db.db.user.removeOnDelete(updateOtherUser);
    };

  }, [db, user, otherUserId]);

  useEffect(() => {
    if (!db || !user || !conversation) return;

    const updateMessages = () => {
      const allMsgs = Array.from(db.db.message.iter()).filter(
        (m) => m.channelType === "DirectMessage" && m.channelId === conversation.id
      );
      // Sort by sentAt
      allMsgs.sort((a, b) => Number(a.sentAt) - Number(b.sentAt));
      setMessages(allMsgs);
    };

    updateMessages();

    db.db.message.onInsert(updateMessages);
    db.db.message.onUpdate(updateMessages);
    db.db.message.onDelete(updateMessages);

    return () => {
      db.db.message.removeOnInsert(updateMessages);
      db.db.message.removeOnUpdate(updateMessages);
      db.db.message.removeOnDelete(updateMessages);
    };
  }, [db, user, conversation]);

  useEffect(() => {
    if (!conversation || messages.length === 0) return;
    const latestId = messages[messages.length - 1]?.id;
    if (!latestId) return;
    localStorage.setItem(`cc_last_seen_DirectMessage_${conversation.id.toString()}`, latestId.toString());
    window.dispatchEvent(new Event("cc:read-state-change"));
  }, [conversation, messages]);

  // Request to open DM if it doesn't exist
  useEffect(() => {
    if (!db || !user || conversation) return;
    db.reducers.openDm({
      otherUserId,
    });
  }, [db, user, conversation, otherUserId]);

  async function handleSendMessage(content: string) {
    if (!db || !user || !conversation) return;
    try {
      await db.reducers.sendMessage({
        content,
        channelType: "DirectMessage",
        channelId: conversation.id,
      });
    } catch (e) {
      console.error("Failed to send DM", e);
    }
  }

  if (!user || !otherUser) return null;

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)" }}>
          {otherUser.displayName}
        </span>
      </div>

      <MessageList
        messages={messages}
        users={new Map<bigint, User>([
          [user.id, user],
          [otherUser.id, otherUser],
        ])}
        currentUser={user}
        emptyText={`This is the beginning of your direct message history with ${otherUser.displayName}.`}
      />

      {/* Input */}
      <div className="chat-footer">
        <MessageInput 
          placeholder={`Message ${otherUser.displayName}`} 
          onSend={handleSendMessage} 
        />
      </div>
    </div>
  );
}
