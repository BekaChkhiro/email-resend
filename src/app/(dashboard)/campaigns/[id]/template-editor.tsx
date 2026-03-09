"use client";

import { useState, useRef, useTransition } from "react";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";
import { Button, useConfirmDialog } from "@/components/ui";

type Template = {
  id: string;
  versionName: string;
  body: string;
  sortOrder: number;
};

const VARIABLES = [
  { label: "{{firstName}}", value: "{{firstName}}" },
  { label: "{{companyName}}", value: "{{companyName}}" },
  { label: "{{email}}", value: "{{email}}" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{firstName}}": "John",
  "{{companyName}}": "Acme Inc",
  "{{email}}": "john@example.com",
};

function renderPreview(body: string): string {
  let result = body;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

export default function TemplateEditor({
  campaignId,
  initialTemplates,
  emailFormat,
  readOnly,
}: {
  campaignId: string;
  initialTemplates: Template[];
  emailFormat: string;
  readOnly: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { confirm, Dialog } = useConfirmDialog();

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const newValue =
      current.substring(0, start) + variable + current.substring(end);

    // Update the textarea value directly and dispatch input event
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    nativeSetter?.call(textarea, newValue);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleCreate(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createTemplate(campaignId, formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Template created." });
        setShowForm(false);
      }
    });
  }

  function handleUpdate(templateId: string, formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTemplate(templateId, formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Template updated." });
        setEditingTemplate(null);
      }
    });
  }

  async function handleDelete(templateId: string) {
    const confirmed = await confirm({
      title: "Delete Template",
      message: "Are you sure you want to delete this template? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteTemplate(templateId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Template deleted." });
      }
    });
  }

  const isFormOpen = showForm || editingTemplate !== null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Templates ({initialTemplates.length})
        </h2>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setShowForm(true);
            }}
          >
            + Add Template
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {initialTemplates.length === 0 && !showForm && (
        <div className="rounded-lg border border-gray-200 bg-white py-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No templates yet.{" "}
            {!readOnly && "Add a template to get started."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {initialTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {template.versionName}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() =>
                    setPreviewId(
                      previewId === template.id ? null : template.id
                    )
                  }
                >
                  {previewId === template.id ? "Hide Preview" : "Preview"}
                </Button>
                {!readOnly && (
                  <>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setShowForm(false);
                        setEditingTemplate(template);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleDelete(template.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
              {template.body}
            </p>

            {previewId === template.id && (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Preview with sample data
                </p>
                {emailFormat === "html" ? (
                  <div
                    className="prose prose-sm max-w-none text-sm email-preview-content"
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(template.body),
                    }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap text-gray-900 dark:text-white">
                    {renderPreview(template.body)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {editingTemplate ? "Edit Template" : "Add Template"}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (editingTemplate) {
                  handleUpdate(editingTemplate.id, formData);
                } else {
                  handleCreate(formData);
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Version Name
                </label>
                <input
                  name="versionName"
                  type="text"
                  required
                  defaultValue={editingTemplate?.versionName ?? ""}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Insert variable:{" "}
                </span>
                {VARIABLES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => insertVariable(v.value)}
                    className="mr-1.5 rounded bg-emerald-50 px-2 py-0.5 text-xs font-mono text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Body
                </label>
                <textarea
                  ref={textareaRef}
                  name="body"
                  required
                  rows={10}
                  defaultValue={editingTemplate?.body ?? ""}
                  placeholder="Write your email body here. Use {{firstName}}, {{companyName}}, {{email}} for personalization."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTemplate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isPending}
                  loadingText="Saving..."
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog />
    </div>
  );
}
