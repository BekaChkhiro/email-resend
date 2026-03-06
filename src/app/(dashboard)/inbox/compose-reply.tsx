"use client";

import { useState, useTransition } from "react";
import { sendReply } from "./actions";

export default function ComposeReply({
  contactId,
  campaignId,
  lastMessageId,
  onSent,
}: {
  contactId: string;
  campaignId: string | null;
  lastMessageId: string | undefined;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Please enter a message.");
      return;
    }

    const formData = new FormData();
    formData.set("contactId", contactId);
    if (campaignId) {
      formData.set("campaignId", campaignId);
    }
    formData.set("body", body);
    if (lastMessageId) {
      formData.set("replyToMessageId", lastMessageId);
    }

    startTransition(async () => {
      const result = await sendReply(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        onSent();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 border-t border-gray-200 p-4"
    >
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          disabled={isPending}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <SendIcon className="h-4 w-4" />
              Send
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
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
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}
