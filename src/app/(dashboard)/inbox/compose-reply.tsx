"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { sendReply, generateAIReply, AIAction, Message } from "./actions";
import { Button } from "@/components/ui";

export default function ComposeReply({
  contactId,
  campaignId,
  lastMessageId,
  onSent,
  conversationHistory,
  contactName,
  contactEmail,
}: {
  contactId: string;
  campaignId: string | null;
  lastMessageId: string | undefined;
  onSent: () => void;
  conversationHistory: Message[];
  contactName: string;
  contactEmail: string;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIAction | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close AI menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setIsAIMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus AI prompt input when opened
  useEffect(() => {
    if (showAIPrompt) {
      aiPromptRef.current?.focus();
    }
  }, [showAIPrompt]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate max height (50% of viewport height minus some padding for toolbar)
    const maxHeight = window.innerHeight * 0.35;
    const minHeight = 80; // Minimum 3 rows approximately

    // Set height based on content, capped at maxHeight
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [body]);

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

  function handleAIPromptKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerateWithPrompt();
    }
    if (e.key === "Escape") {
      setShowAIPrompt(false);
      setAiPrompt("");
    }
  }

  async function handleGenerateWithPrompt() {
    if (!aiPrompt.trim()) return;

    setShowAIPrompt(false);
    setIsAILoading(true);
    setAiAction("generate_reply");
    setError(null);

    try {
      const result = await generateAIReply({
        action: "generate_reply",
        currentText: body,
        conversationHistory,
        contactName,
        contactEmail,
        customPrompt: aiPrompt.trim(),
      });

      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        setBody(result.text);
        textareaRef.current?.focus();
      }
    } catch {
      setError("AI generation failed. Please try again.");
    } finally {
      setIsAILoading(false);
      setAiAction(null);
      setAiPrompt("");
    }
  }

  async function handleAIAction(action: AIAction | "generate_auto" | "generate_custom") {
    setIsAIMenuOpen(false);

    // For custom prompt, show prompt input
    if (action === "generate_custom") {
      setShowAIPrompt(true);
      return;
    }

    // Convert generate_auto to generate_reply
    const actualAction: AIAction = action === "generate_auto" ? "generate_reply" : action;

    setIsAILoading(true);
    setAiAction(actualAction);
    setError(null);

    try {
      const result = await generateAIReply({
        action: actualAction,
        currentText: body,
        conversationHistory,
        contactName,
        contactEmail,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        setBody(result.text);
        textareaRef.current?.focus();
      }
    } catch {
      setError("AI generation failed. Please try again.");
    } finally {
      setIsAILoading(false);
      setAiAction(null);
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

  const aiActions: { action: AIAction | "generate_auto" | "generate_custom"; label: string; icon: React.ReactNode; requiresText: boolean; isSubItem?: boolean }[] = [
    {
      action: "generate_auto",
      label: "Auto Generate",
      icon: <BoltIcon className="h-4 w-4" />,
      requiresText: false,
    },
    {
      action: "generate_custom",
      label: "Custom Prompt",
      icon: <PencilIcon className="h-4 w-4" />,
      requiresText: false,
    },
    {
      action: "improve",
      label: "Improve Text",
      icon: <WandIcon className="h-4 w-4" />,
      requiresText: true,
    },
    {
      action: "shorter",
      label: "Make Shorter",
      icon: <ShorterIcon className="h-4 w-4" />,
      requiresText: true,
    },
    {
      action: "longer",
      label: "Make Longer",
      icon: <LongerIcon className="h-4 w-4" />,
      requiresText: true,
    },
    {
      action: "formal",
      label: "More Formal",
      icon: <FormalIcon className="h-4 w-4" />,
      requiresText: true,
    },
    {
      action: "friendly",
      label: "More Friendly",
      icon: <FriendlyIcon className="h-4 w-4" />,
      requiresText: true,
    },
    {
      action: "fix_grammar",
      label: "Fix Grammar",
      icon: <CheckIcon className="h-4 w-4" />,
      requiresText: true,
    },
  ];

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

      {/* AI Prompt Input */}
      {showAIPrompt && (
        <div className="mb-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 border-b border-emerald-200 px-4 py-2 dark:border-emerald-500/30">
            <SparklesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              What would you like to write?
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAIPrompt(false);
                setAiPrompt("");
              }}
              className="ml-auto rounded-full p-1 text-emerald-600 hover:bg-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <textarea
              ref={aiPromptRef}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={handleAIPromptKeyDown}
              placeholder="e.g., Write a polite follow-up asking about their decision..."
              rows={2}
              className="w-full resize-none rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-500/30 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter to generate
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateWithPrompt}
                disabled={!aiPrompt.trim()}
                leftIcon={<SparklesIcon className="h-4 w-4" />}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className={`rounded-xl transition-all ${
          isFocused
            ? "ring-2 ring-emerald-500"
            : "ring-1 ring-gray-200 dark:ring-zinc-700"
        }`}
      >
        {/* AI Loading indicator */}
        {isAILoading && (
          <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              {aiAction === "generate_reply" && "Generating reply..."}
              {aiAction === "improve" && "Improving text..."}
              {aiAction === "shorter" && "Shortening..."}
              {aiAction === "longer" && "Expanding..."}
              {aiAction === "formal" && "Making more formal..."}
              {aiAction === "friendly" && "Making friendlier..."}
              {aiAction === "fix_grammar" && "Fixing grammar..."}
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type your reply..."
          disabled={isPending || isAILoading}
          style={{ minHeight: "80px" }}
          className="w-full resize-y overflow-y-auto rounded-t-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between rounded-b-xl border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
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
              disabled={isPending || isAILoading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              <PaperclipIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            {/* AI Button with Dropdown */}
            <div ref={aiMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
                disabled={isPending || isAILoading}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                  isAIMenuOpen || showAIPrompt
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <SparklesIcon className="h-5 w-5" />
                <span className="hidden sm:inline">AI</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {/* AI Dropdown Menu */}
              {isAIMenuOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {/* Generate section */}
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-zinc-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Generate Reply</p>
                  </div>
                  <div className="py-1">
                    {aiActions.slice(0, 2).map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => handleAIAction(item.action)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {/* Edit section */}
                  <div className="border-t border-gray-100 dark:border-zinc-700">
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Edit Text</p>
                    </div>
                    <div className="pb-1">
                      {aiActions.slice(2).map((item) => {
                        const isDisabled = item.requiresText && !body.trim();
                        return (
                          <button
                            key={item.action}
                            type="button"
                            onClick={() => !isDisabled && handleAIAction(item.action)}
                            disabled={isDisabled}
                            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                              isDisabled
                                ? "cursor-not-allowed text-gray-300 dark:text-zinc-600"
                                : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <span className={isDisabled ? "text-gray-300 dark:text-zinc-600" : "text-emerald-600 dark:text-emerald-400"}>
                              {item.icon}
                            </span>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-gray-400 dark:text-zinc-500 sm:inline">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter to send
            </span>
            <Button
              type="submit"
              disabled={!hasContent || isAILoading}
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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function WandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  );
}

function ShorterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h6.75" />
    </svg>
  );
}

function LongerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function FormalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function FriendlyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}
