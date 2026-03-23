"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  sendNewEmail,
  searchContacts,
  getActiveDomains,
  generateComposeAI,
  checkSpamWithAI,
  DomainOption,
  ContactOption,
  ComposeAIAction,
  AISpamCheckResult,
} from "./actions";

interface ComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export default function ComposeDialog({ isOpen, onClose, onSent }: ComposeDialogProps) {
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [toEmail, setToEmail] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Contact search
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);

  // AI state
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiAction, setAiAction] = useState<ComposeAIAction | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [spamResult, setSpamResult] = useState<AISpamCheckResult | null>(null);
  const [isSpamChecking, setIsSpamChecking] = useState(false);

  // Load domains on open
  useEffect(() => {
    if (isOpen) {
      getActiveDomains().then((data) => {
        setDomains(data);
        if (data.length > 0 && !selectedDomainId) {
          setSelectedDomainId(data[0].id);
        }
      });
    }
  }, [isOpen, selectedDomainId]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setToEmail("");
      setSelectedContactId(null);
      setSubject("");
      setBody("");
      setAttachments([]);
      setError(null);
      setContactQuery("");
      setContactResults([]);
      // Reset AI state
      setIsAIMenuOpen(false);
      setShowAIPrompt(false);
      setAiPrompt("");
      setSpamResult(null);
    }
  }, [isOpen]);

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

  // Search contacts with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (contactQuery.length < 2) {
      setContactResults([]);
      setShowContactDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchContacts(contactQuery);
      setContactResults(results);
      setShowContactDropdown(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [contactQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        contactInputRef.current &&
        !contactInputRef.current.contains(e.target as Node)
      ) {
        setShowContactDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleContactSelect(contact: ContactOption) {
    setToEmail(contact.email);
    setSelectedContactId(contact.id);
    setContactQuery(contact.email);
    setShowContactDropdown(false);
  }

  function handleContactInputChange(value: string) {
    setContactQuery(value);
    setToEmail(value);
    setSelectedContactId(null); // Reset selected contact when typing
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedDomainId) {
      setError("Please select a sending email.");
      return;
    }
    if (!toEmail.trim()) {
      setError("Please enter a recipient email.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (!body.trim()) {
      setError("Please enter a message.");
      return;
    }

    const formData = new FormData();
    formData.set("domainId", selectedDomainId);
    formData.set("toEmail", toEmail.trim());
    if (selectedContactId) {
      formData.set("contactId", selectedContactId);
    }
    formData.set("subject", subject.trim());
    formData.set("body", body);

    for (const file of attachments) {
      formData.append("attachments", file);
    }

    startTransition(async () => {
      const result = await sendNewEmail(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSent();
        onClose();
      }
    });
  }

  // AI Prompt key handler
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

  // Get contact name from selected contact or email
  function getRecipientName(): string | undefined {
    const contact = contactResults.find((c) => c.id === selectedContactId);
    if (contact) {
      return `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || undefined;
    }
    return undefined;
  }

  async function handleGenerateWithPrompt() {
    if (!aiPrompt.trim()) return;

    setShowAIPrompt(false);
    setIsAILoading(true);
    setAiAction("generate_email");
    setError(null);

    try {
      const result = await generateComposeAI({
        action: "generate_email",
        currentText: body,
        recipientEmail: toEmail,
        recipientName: getRecipientName(),
        subject: subject,
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

  async function handleAIAction(action: ComposeAIAction | "generate_auto" | "generate_custom") {
    setIsAIMenuOpen(false);

    // For custom prompt, show prompt input
    if (action === "generate_custom") {
      setShowAIPrompt(true);
      return;
    }

    // Convert generate_auto to generate_email
    const actualAction: ComposeAIAction = action === "generate_auto" ? "generate_email" : action;

    setIsAILoading(true);
    setAiAction(actualAction);
    setError(null);

    try {
      const result = await generateComposeAI({
        action: actualAction,
        currentText: body,
        recipientEmail: toEmail,
        recipientName: getRecipientName(),
        subject: subject,
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

  async function handleSpamCheck() {
    setIsAIMenuOpen(false);
    if (!body.trim()) return;

    setIsSpamChecking(true);
    setError(null);

    try {
      const result = await checkSpamWithAI(body);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSpamResult(result);
      }
    } catch {
      setError("Spam check failed. Please try again.");
    } finally {
      setIsSpamChecking(false);
    }
  }

  const aiActions: { action: ComposeAIAction | "generate_auto" | "generate_custom"; label: string; icon: React.ReactNode; requiresText: boolean }[] = [
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <MailIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Email
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
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

          {/* Form fields */}
          <div className="space-y-4 p-6">
            {/* From (Domain Selector) */}
            <div className="flex items-center gap-4">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-zinc-400">
                From
              </label>
              <div className="relative flex-1">
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.fromName} &lt;{domain.fromEmail}&gt;
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* To (Contact Search) */}
            <div className="flex items-center gap-4">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-zinc-400">
                To
              </label>
              <div className="relative flex-1">
                <input
                  ref={contactInputRef}
                  type="text"
                  value={contactQuery}
                  onChange={(e) => handleContactInputChange(e.target.value)}
                  onFocus={() => contactResults.length > 0 && setShowContactDropdown(true)}
                  placeholder="Search contacts or enter email..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                )}

                {/* Contact dropdown */}
                {showContactDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {contactResults.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleContactSelect(contact)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {contact.firstName || contact.lastName
                              ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                              : contact.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                            <span className="truncate">{contact.email}</span>
                            {contact.companyName && (
                              <>
                                <span>·</span>
                                <span className="truncate">{contact.companyName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-4">
              <label className="w-16 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-zinc-400">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              />
            </div>

            {/* Spam Check Result */}
            {spamResult && (
              <div className={`overflow-hidden rounded-xl border ${
                spamResult.risk === "none"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  : spamResult.risk === "low"
                  ? "border-yellow-200 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10"
                  : spamResult.risk === "medium"
                  ? "border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10"
                  : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
              }`}>
                <div className={`flex items-center justify-between border-b px-4 py-2 ${
                  spamResult.risk === "none"
                    ? "border-emerald-200 dark:border-emerald-500/30"
                    : spamResult.risk === "low"
                    ? "border-yellow-200 dark:border-yellow-500/30"
                    : spamResult.risk === "medium"
                    ? "border-orange-200 dark:border-orange-500/30"
                    : "border-red-200 dark:border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldIcon className={`h-4 w-4 ${
                      spamResult.risk === "none"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : spamResult.risk === "low"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : spamResult.risk === "medium"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-red-600 dark:text-red-400"
                    }`} />
                    <span className={`text-sm font-medium ${
                      spamResult.risk === "none"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : spamResult.risk === "low"
                        ? "text-yellow-700 dark:text-yellow-400"
                        : spamResult.risk === "medium"
                        ? "text-orange-700 dark:text-orange-400"
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      Spam Score: {spamResult.score}/10
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      spamResult.risk === "none"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : spamResult.risk === "low"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                        : spamResult.risk === "medium"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    }`}>
                      {spamResult.risk === "none" ? "Clean" : spamResult.risk.charAt(0).toUpperCase() + spamResult.risk.slice(1) + " risk"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpamResult(null)}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Summary */}
                <div className="border-b border-gray-100 px-4 py-2 dark:border-zinc-700/50">
                  <p className="text-sm text-gray-600 dark:text-zinc-300">{spamResult.summary}</p>
                </div>

                {/* Issues with suggestions */}
                {spamResult.issues.length > 0 && (
                  <div className="p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                        {spamResult.issues.length} issue{spamResult.issues.length > 1 ? "s" : ""} found:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSpamResult(null);
                          handleAIAction("fix_spam" as ComposeAIAction);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        <WandIcon className="h-3 w-3" />
                        Fix All with AI
                      </button>
                    </div>
                    <div className="space-y-2">
                      {spamResult.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-white p-2.5 ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700"
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                              {issue.word}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 dark:text-zinc-400">{issue.reason}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs">
                                <span className="text-gray-400">→</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">{issue.suggestion}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Prompt Input */}
            {showAIPrompt && (
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
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
                    placeholder="e.g., Write a professional introduction email about our new product..."
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

            {/* Body */}
            <div className="rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
              {/* AI Loading indicator */}
              {(isAILoading || isSpamChecking) && (
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {isSpamChecking && "Analyzing for spam triggers..."}
                    {aiAction === "generate_email" && "Generating email..."}
                    {aiAction === "improve" && "Improving text..."}
                    {aiAction === "shorter" && "Shortening..."}
                    {aiAction === "longer" && "Expanding..."}
                    {aiAction === "formal" && "Making more formal..."}
                    {aiAction === "friendly" && "Making friendlier..."}
                    {aiAction === "fix_grammar" && "Fixing grammar..."}
                    {aiAction === "fix_spam" && "Removing spam triggers..."}
                  </span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={8}
                disabled={isAILoading || isSpamChecking}
                className="w-full resize-none border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-gray-100 py-2 pl-3 pr-2 text-sm dark:bg-zinc-800"
                  >
                    <FileIcon className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                    <div className="flex flex-col">
                      <span className="max-w-[120px] truncate text-sm font-medium text-gray-700 dark:text-zinc-300">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="ml-1 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 dark:hover:bg-zinc-700"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-zinc-700">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="compose-attachment-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isAILoading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                      <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Generate Email</p>
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
                    {/* Spam Check section */}
                    <div className="border-t border-gray-100 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={handleSpamCheck}
                        disabled={!body.trim() || isSpamChecking}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                          !body.trim() || isSpamChecking
                            ? "cursor-not-allowed text-gray-300 dark:text-zinc-600"
                            : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <span className={!body.trim() || isSpamChecking ? "text-gray-300 dark:text-zinc-600" : "text-orange-500 dark:text-orange-400"}>
                          <ShieldIcon className="h-4 w-4" />
                        </span>
                        Spam Check (AI)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!toEmail.trim() || !subject.trim() || !body.trim() || isAILoading}
                isLoading={isPending}
                loadingText="Sending..."
                leftIcon={!isPending ? <SendIcon className="h-4 w-4" /> : undefined}
              >
                Send
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icons
function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
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

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
