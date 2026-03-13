"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { updateSubjectTemplate } from "./actions";
import { Button } from "@/components/ui";

const AVAILABLE_FIELDS = [
  { label: "First Name", value: "firstName" },
  { label: "Last Name", value: "lastName" },
  { label: "Title", value: "title" },
  { label: "Company Name", value: "companyName" },
  { label: "Company Industry", value: "companyIndustry" },
  { label: "Location", value: "location" },
  { label: "Country", value: "country" },
];

interface SubjectTemplateEditorProps {
  campaignId: string;
  initialSubject: string;
  readOnly: boolean;
}

export default function SubjectTemplateEditor({
  campaignId,
  initialSubject,
  readOnly,
}: SubjectTemplateEditorProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasChanges = subject !== initialSubject;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFieldMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateSubjectTemplate(campaignId, subject);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Subject template saved." });
      }
    });
  }

  function insertField(fieldValue: string) {
    const input = inputRef.current;
    if (!input) return;

    const start = cursorPosition ?? input.selectionStart ?? subject.length;
    const before = subject.slice(0, start);
    const after = subject.slice(start);
    const newSubject = `${before}{{${fieldValue}}}${after}`;

    setSubject(newSubject);
    setShowFieldMenu(false);

    // Focus input and set cursor position after the inserted field
    setTimeout(() => {
      input.focus();
      const newPos = start + fieldValue.length + 4; // +4 for {{ and }}
      input.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function handleInputClick() {
    const input = inputRef.current;
    if (input) {
      setCursorPosition(input.selectionStart);
    }
  }

  function handleInputKeyUp() {
    const input = inputRef.current;
    if (input) {
      setCursorPosition(input.selectionStart);
    }
  }

  // Generate preview with sample data
  function getPreview() {
    return subject
      .replace(/\{\{firstName\}\}/g, "John")
      .replace(/\{\{lastName\}\}/g, "Smith")
      .replace(/\{\{title\}\}/g, "CEO")
      .replace(/\{\{companyName\}\}/g, "Acme Corp")
      .replace(/\{\{companyIndustry\}\}/g, "Software")
      .replace(/\{\{location\}\}/g, "San Francisco")
      .replace(/\{\{country\}\}/g, "USA");
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MailIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subject Line Template
          </h2>
        </div>
        {subject.includes("{{") && (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Personalized
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Create a personalized subject line template. Use contact fields to make each email unique.
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

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="subject-template"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Subject Line
          </label>

          {/* Insert Field Dropdown */}
          {!readOnly && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowFieldMenu(!showFieldMenu)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  showFieldMenu
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <PlusIcon className="h-4 w-4" />
                <span>Insert Field</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {showFieldMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-zinc-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-zinc-500">Contact Fields</p>
                  </div>
                  <div className="py-1">
                    {AVAILABLE_FIELDS.map((field) => (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => insertField(field.value)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400">
                          <TagIcon className="h-4 w-4" />
                        </span>
                        {field.label}
                        <span className="ml-auto text-xs text-gray-400 dark:text-zinc-500">
                          {`{{${field.value}}}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id="subject-template"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          disabled={readOnly}
          placeholder="e.g. Partnership opportunity for {{companyName}}"
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
        />

        {/* Preview */}
        {subject && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Preview:</p>
            <p className="text-sm text-gray-900 dark:text-white">{getPreview()}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Insert Fields
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABLE_FIELDS.map((field) => (
            <button
              key={field.value}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) {
                  setSubject((prev) => prev + `{{${field.value}}}`);
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
            disabled={!hasChanges || !subject.trim()}
            isLoading={isPending}
            loadingText="Saving..."
          >
            Save Subject
          </Button>
        </div>
      )}
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
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
