"use client";

import { useState } from "react";
import type { Conversation } from "./actions";
import ConversationThread from "./conversation-thread";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

export default function ConversationsList({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No messages yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Replies to your campaign emails will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Conversations sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => setSelectedId(conversation.id)}
            className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedId === conversation.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm truncate ${
                      conversation.unreadCount > 0
                        ? "font-semibold text-gray-900"
                        : "font-medium text-gray-700"
                    }`}
                  >
                    {conversation.contactName}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-white bg-blue-600 rounded-full">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {conversation.contactEmail}
                </p>
                {conversation.campaignName && (
                  <p className="text-xs text-blue-600 truncate mt-0.5">
                    {conversation.campaignName}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatDate(conversation.lastMessage.receivedAt)}
              </span>
            </div>
            <p
              className={`text-sm mt-1 truncate ${
                conversation.unreadCount > 0
                  ? "font-medium text-gray-900"
                  : "text-gray-600"
              }`}
            >
              {conversation.lastMessage.subject}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {conversation.lastMessage.direction === "outbound" && (
                <span className="text-gray-400">You: </span>
              )}
              {conversation.lastMessage.preview}
            </p>
          </button>
        ))}
      </div>

      {/* Thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <ConversationThread
            key={selectedConversation.id}
            contactId={selectedConversation.contactId}
            contactName={selectedConversation.contactName}
            contactEmail={selectedConversation.contactEmail}
            campaignId={selectedConversation.campaignId}
            campaignName={selectedConversation.campaignName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}
