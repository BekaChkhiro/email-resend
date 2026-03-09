"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updateAiPrompt, generateAIPrompt, AIPromptAction } from "./actions";
import { Button } from "@/components/ui";

const AVAILABLE_FIELDS = [
  { label: "First Name", value: "firstName" },
  { label: "Last Name", value: "lastName" },
  { label: "Title", value: "title" },
  { label: "Company Name", value: "companyName" },
  { label: "Company Industry", value: "companyIndustry" },
  { label: "Company Size", value: "companySize" },
  { label: "Company Revenue", value: "companyRevenue" },
  { label: "Company Funding", value: "companyFunding" },
  { label: "Company Type", value: "companyType" },
  { label: "Company Description", value: "companyDescription" },
  { label: "Location", value: "location" },
  { label: "Region", value: "region" },
  { label: "Country", value: "country" },
  { label: "Decision Maker", value: "decisionMaker" },
];

interface AiPromptEditorProps {
  campaignId: string;
  initialPrompt: string | null;
  readOnly: boolean;
}

export default function AiPromptEditor({
  campaignId,
  initialPrompt,
  readOnly,
}: AiPromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiAction, setAiAction] = useState<AIPromptAction | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChanges = prompt !== (initialPrompt ?? "");

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

    // Calculate min/max heights
    const minHeight = 150; // ~6 rows
    const maxHeight = window.innerHeight * 0.5; // 50% of viewport

    // Set height based on content, capped at maxHeight
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [prompt]);

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateAiPrompt(campaignId, prompt);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "AI prompt saved." });
      }
    });
  }

  async function handleGenerateWithPrompt() {
    if (!aiCustomPrompt.trim()) return;

    setShowAIPrompt(false);
    setIsAILoading(true);
    setAiAction("generate_custom");
    setMessage(null);

    try {
      const result = await generateAIPrompt({
        action: "generate_custom",
        currentText: prompt,
        customPrompt: aiCustomPrompt.trim(),
      });

      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result.text) {
        setPrompt(result.text);
        textareaRef.current?.focus();
      }
    } catch {
      setMessage({ type: "error", text: "AI generation failed. Please try again." });
    } finally {
      setIsAILoading(false);
      setAiAction(null);
      setAiCustomPrompt("");
    }
  }

  async function handleAIAction(action: AIPromptAction | "generate_custom_open") {
    setIsAIMenuOpen(false);

    // For custom prompt, show prompt input
    if (action === "generate_custom_open") {
      setShowAIPrompt(true);
      return;
    }

    setIsAILoading(true);
    setAiAction(action);
    setMessage(null);

    try {
      const result = await generateAIPrompt({
        action,
        currentText: prompt,
      });

      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result.text) {
        setPrompt(result.text);
        textareaRef.current?.focus();
      }
    } catch {
      setMessage({ type: "error", text: "AI generation failed. Please try again." });
    } finally {
      setIsAILoading(false);
      setAiAction(null);
    }
  }

  function handleAIPromptKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerateWithPrompt();
    }
    if (e.key === "Escape") {
      setShowAIPrompt(false);
      setAiCustomPrompt("");
    }
  }

  const aiActions: { action: AIPromptAction | "generate_custom_open"; label: string; icon: React.ReactNode; requiresText: boolean }[] = [
    {
      action: "generate_custom_open",
      label: "Generate with AI",
      icon: <BoltIcon className="h-4 w-4" />,
      requiresText: false,
    },
    {
      action: "improve",
      label: "Improve Prompt",
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
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Email Generation
        </h2>
        {prompt.trim() ? (
          <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            AI Enabled
          </span>
        ) : (
          <span className="text-sm text-gray-400">Optional</span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Write instructions for ChatGPT to generate a unique email for each
        contact. Leave empty to use templates instead.
      </p>

      {message && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.type === "error" && <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />}
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-auto rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AI Custom Prompt Input */}
      {showAIPrompt && (
        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 border-b border-emerald-200 px-4 py-2 dark:border-emerald-500/30">
            <SparklesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              What kind of AI prompt do you need?
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAIPrompt(false);
                setAiCustomPrompt("");
              }}
              className="ml-auto rounded-full p-1 text-emerald-600 hover:bg-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <textarea
              ref={aiPromptRef}
              value={aiCustomPrompt}
              onChange={(e) => setAiCustomPrompt(e.target.value)}
              onKeyDown={handleAIPromptKeyDown}
              placeholder="e.g., Write a cold email for SaaS founders about our analytics product, mention their industry and company size..."
              rows={2}
              className="w-full resize-none rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-500/30 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"} + Enter to generate
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateWithPrompt}
                disabled={!aiCustomPrompt.trim()}
                leftIcon={<SparklesIcon className="h-4 w-4" />}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ai-prompt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            AI Prompt / Instructions
          </label>

          {/* AI Tools Dropdown */}
          {!readOnly && (
            <div ref={aiMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
                disabled={isAILoading}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                  isAIMenuOpen || showAIPrompt
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <SparklesIcon className="h-4 w-4" />
                <span>AI Tools</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {/* AI Dropdown Menu */}
              {isAIMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {/* Generate section */}
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-zinc-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Generate</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleAIAction("generate_custom_open")}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400">
                        <BoltIcon className="h-4 w-4" />
                      </span>
                      Generate with AI
                    </button>
                  </div>
                  {/* Edit section */}
                  <div className="border-t border-gray-100 dark:border-zinc-700">
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Edit Prompt</p>
                    </div>
                    <div className="pb-1">
                      {aiActions.slice(1).map((item) => {
                        const isDisabled = item.requiresText && !prompt.trim();
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
          )}
        </div>

        {/* AI Loading indicator */}
        {isAILoading && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              {aiAction === "generate_custom" && "Generating prompt..."}
              {aiAction === "improve" && "Improving prompt..."}
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
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={readOnly || isAILoading}
          placeholder={`Example: Write a cold outreach email for {{companyName}} about our SaaS product. Be personal, mention their industry ({{companyIndustry}}) and company size ({{companySize}}). Keep it under 150 words.`}
          style={{ minHeight: "150px" }}
          className="mt-2 block w-full resize-none overflow-y-auto rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          The AI will receive each contact&apos;s data and generate a unique
          email based on these instructions.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Available Contact Fields
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABLE_FIELDS.map((field) => (
            <button
              key={field.value}
              type="button"
              disabled={readOnly || isAILoading}
              onClick={() => {
                if (!readOnly && !isAILoading) {
                  setPrompt((prev) => prev + `{{${field.value}}}`);
                }
              }}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-gray-50 disabled:hover:text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 dark:disabled:hover:border-gray-600 dark:disabled:hover:bg-gray-700 dark:disabled:hover:text-gray-400"
            >
              {`{{${field.label}}}`}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isAILoading}
            isLoading={isPending}
            loadingText="Saving..."
          >
            Save Prompt
          </Button>
        </div>
      )}
    </div>
  );
}

// Icons
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
