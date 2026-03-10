"use client";

import { useState, useTransition, useCallback } from "react";
import { deleteContact } from "./actions";
import ContactForm from "./contact-form";
import CSVImport from "@/components/csv-import";
import { useRouter } from "next/navigation";
import { Button, useConfirmDialog } from "@/components/ui";
import { validateContactEmail, resetAllEmailStatuses } from "@/app/actions/email";
import { getEmailStatusInfo } from "@/lib/emailValidator";

type Contact = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  title: string | null;
  companyName: string | null;
  companyIndustry: string | null;
  companyDomain: string | null;
  location: string | null;
  country: string | null;
  linkedin: string | null;
  linkedinProfileUrl: string | null;
  domain: string | null;
  emailStatus: string | null;
  isUnsubscribed: boolean;
  createdAt: Date;
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-rose-500",
];

function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function ContactsTable({
  contacts,
  total,
  page,
  limit,
}: {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, Dialog } = useConfirmDialog();

  // Email validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0, currentEmail: '' });
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.companyName?.toLowerCase().includes(q) ?? false) ||
      (c.title?.toLowerCase().includes(q) ?? false) ||
      (c.country?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: "Delete Contact",
      message:
        "Are you sure you want to delete this contact? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteContact(id);
      setDeletingId(null);
    });
  }

  // Validate single contact email
  async function handleValidateSingle(contact: Contact) {
    setValidatingId(contact.id);
    try {
      await validateContactEmail(contact.id);
      router.refresh();
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidatingId(null);
    }
  }

  // Validate all unverified contacts
  async function handleValidateAll() {
    const unverified = contacts.filter(c => !c.emailStatus);
    if (unverified.length === 0) {
      alert('All contacts are already validated.');
      return;
    }

    const confirmed = await confirm({
      title: "Validate Emails",
      message: `This will validate ${unverified.length} email(s). Due to API rate limits (5/minute), this will take approximately ${Math.ceil(unverified.length * 12 / 60)} minutes. Continue?`,
      confirmLabel: "Start Validation",
      variant: "info",
    });

    if (!confirmed) return;

    setIsValidating(true);
    setValidationProgress({ current: 0, total: unverified.length, currentEmail: '' });

    for (let i = 0; i < unverified.length; i++) {
      const contact = unverified[i];
      setValidationProgress({
        current: i + 1,
        total: unverified.length,
        currentEmail: contact.email
      });

      try {
        await validateContactEmail(contact.id);
      } catch (err) {
        console.error(`Failed to validate ${contact.email}:`, err);
      }

      // Wait 12 seconds between requests (except for last one)
      if (i < unverified.length - 1) {
        await new Promise(r => setTimeout(r, 12000));
      }
    }

    setIsValidating(false);
    setValidationProgress({ current: 0, total: 0, currentEmail: '' });
    router.refresh();
  }

  // Stop validation
  const stopValidation = useCallback(() => {
    setIsValidating(false);
    setValidationProgress({ current: 0, total: 0, currentEmail: '' });
    router.refresh();
  }, [router]);

  // Re-validate ALL contacts (reset statuses first)
  async function handleRevalidateAll() {
    const confirmed = await confirm({
      title: "Re-validate All Emails",
      message: `This will reset ALL ${contacts.length} email statuses and re-validate them. Due to API rate limits (5/minute), this will take approximately ${Math.ceil(contacts.length * 12 / 60)} minutes. Continue?`,
      confirmLabel: "Reset & Re-validate",
      variant: "warning",
    });

    if (!confirmed) return;

    // Reset all statuses first
    await resetAllEmailStatuses();
    router.refresh();

    // Small delay to let the page refresh
    await new Promise(r => setTimeout(r, 500));

    setIsValidating(true);
    setValidationProgress({ current: 0, total: contacts.length, currentEmail: '' });

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      setValidationProgress({
        current: i + 1,
        total: contacts.length,
        currentEmail: contact.email
      });

      try {
        await validateContactEmail(contact.id);
      } catch (err) {
        console.error(`Failed to validate ${contact.email}:`, err);
      }

      // Wait 12 seconds between requests (except for last one)
      if (i < contacts.length - 1) {
        await new Promise(r => setTimeout(r, 12000));
      }
    }

    setIsValidating(false);
    setValidationProgress({ current: 0, total: 0, currentEmail: '' });
    router.refresh();
  }

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            onClick={handleValidateAll}
            disabled={isValidating}
            leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            {isValidating ? 'Validating...' : 'Validate New'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRevalidateAll}
            disabled={isValidating}
            leftIcon={<RefreshIcon className="h-4 w-4" />}
          >
            Re-validate All
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowImport(true)}
            leftIcon={<UploadIcon className="h-4 w-4" />}
          >
            Import CSV
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Add Contact
          </Button>
        </div>
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Validating emails... ({validationProgress.current}/{validationProgress.total})
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {validationProgress.currentEmail}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={stopValidation}
            >
              Stop
            </Button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${validationProgress.total > 0
                  ? (validationProgress.current / validationProgress.total) * 100
                  : 0}%`
              }}
            />
          </div>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Estimated time remaining: ~{Math.ceil((validationProgress.total - validationProgress.current) * 12 / 60)} minutes
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
            <UsersIcon className="h-7 w-7 text-gray-400 dark:text-zinc-500" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            {contacts.length === 0 ? "No contacts yet" : "No contacts found"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            {contacts.length === 0
              ? "Add your first contact or import from CSV."
              : "Try adjusting your search."}
          </p>
          {contacts.length === 0 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                Import CSV
              </Button>
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                Add Contact
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Email Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="group transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                  >
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
                            contact.email
                          )}`}
                        >
                          {getInitials(contact.firstName, contact.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="truncate text-sm text-gray-500 dark:text-zinc-400">
                            {contact.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3">
                      {contact.companyName ? (
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {contact.companyName}
                          </p>
                          {contact.title && (
                            <p className="truncate text-sm text-gray-500 dark:text-zinc-400">
                              {contact.title}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-zinc-500">
                          —
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      {contact.country || contact.location ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-300">
                          <LocationIcon className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                          <span>{contact.country || contact.location}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-zinc-500">
                          —
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {contact.isUnsubscribed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Unsubscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Subscribed
                        </span>
                      )}
                    </td>

                    {/* Email Status */}
                    <td className="px-4 py-3">
                      {validatingId === contact.id ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          <span className="text-xs text-gray-500">Checking...</span>
                        </div>
                      ) : contact.emailStatus ? (
                        (() => {
                          const statusInfo = getEmailStatusInfo(contact.emailStatus);
                          return (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                              {contact.emailStatus === 'valid' && <CheckCircleIcon className="h-3 w-3" />}
                              {contact.emailStatus === 'invalid' && <XCircleIcon className="h-3 w-3" />}
                              {contact.emailStatus === 'catch-all' && <QuestionMarkCircleIcon className="h-3 w-3" />}
                              {contact.emailStatus === 'disposable' && <ExclamationTriangleIcon className="h-3 w-3" />}
                              {statusInfo.label}
                            </span>
                          );
                        })()
                      ) : (
                        <button
                          onClick={() => handleValidateSingle(contact)}
                          disabled={isValidating}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                        >
                          <ShieldCheckIcon className="h-3.5 w-3.5" />
                          Verify
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setEditingContact(contact)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deletingId === contact.id || isPending}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          {deletingId === contact.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-zinc-700">
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Showing{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {startItem}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {endItem}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {total}
              </span>{" "}
              contacts
              {search && (
                <span className="text-gray-400">
                  {" "}
                  ({filtered.length} matching)
                </span>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/contacts?page=${page - 1}`)}
                  disabled={page === 1}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => router.push(`/contacts?page=${pageNum}`)}
                      className={`min-w-[32px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        pageNum === page
                          ? "bg-emerald-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => router.push(`/contacts?page=${page + 1}`)}
                  disabled={page === totalPages}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddForm && <ContactForm onClose={() => setShowAddForm(false)} />}
      {editingContact && (
        <ContactForm
          contact={editingContact}
          onClose={() => setEditingContact(null)}
        />
      )}
      {showImport && (
        <CSVImport
          onClose={() => setShowImport(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      <Dialog />
    </div>
  );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function QuestionMarkCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
