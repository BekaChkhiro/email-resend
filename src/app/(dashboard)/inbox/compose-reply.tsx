"use client";

import { useRef, useState, useTransition } from "react";
import { sendReply } from "./actions";
import { Button } from "@/components/ui";

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (body.trim()) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }

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

    for (const file of attachments) {
      formData.append("attachments", file);
    }

    startTransition(async () => {
      const result = await sendReply(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        setAttachments([]);
        onSent();
      }
    });
  }

  const hasContent = body.trim().length > 0 || attachments.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 border-t border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
    >
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 rounded-xl bg-gray-100 py-2 pl-3 pr-2 text-sm transition-colors hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              <FileIcon className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              <div className="flex flex-col">
                <span className="max-w-[140px] truncate text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {file.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-1 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-300 hover:text-red-500 dark:hover:bg-zinc-500"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`rounded-2xl border-2 bg-gray-50 transition-all dark:bg-zinc-900 ${
          isFocused
            ? "border-emerald-500 ring-4 ring-emerald-500/10"
            : "border-gray-200 dark:border-zinc-700"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type your reply..."
          rows={3}
          disabled={isPending}
          className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:text-white dark:placeholder-zinc-500"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 dark:border-zinc-700">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="attachment-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              <PaperclipIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Attach</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 dark:text-zinc-500 sm:inline">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter to send
            </span>
            <Button
              type="submit"
              disabled={!hasContent}
              isLoading={isPending}
              loadingText="Sending..."
              leftIcon={!isPending ? <SendIcon className="h-4 w-4" /> : undefined}
              className="rounded-xl"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}
