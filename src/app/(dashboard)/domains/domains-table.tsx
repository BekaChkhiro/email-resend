"use client";

import { useState, useTransition } from "react";
import { toggleDomainActive, deleteDomain, seedDomains } from "./actions";
import DomainForm from "./domain-form";
import AddDomainForm from "./add-domain-form";
import { Button, useConfirmDialog } from "@/components/ui";

type Domain = {
  id: string;
  domain: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  createdAt: Date;
};

export default function DomainsTable({ domains }: { domains: Domain[] }) {
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [seedError, setSeedError] = useState("");
  const { confirm, Dialog } = useConfirmDialog();

  async function handleToggle(id: string) {
    setTogglingId(id);
    startTransition(async () => {
      await toggleDomainActive(id);
      setTogglingId(null);
    });
  }

  async function handleDelete(id: string, domainName: string) {
    const confirmed = await confirm({
      title: "Delete Domain",
      message: `Are you sure you want to delete ${domainName}? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteDomain(id);
      setDeletingId(null);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  async function handleSeed() {
    setSeedError("");
    startTransition(async () => {
      const result = await seedDomains();
      if (result.error) {
        setSeedError(result.error);
      }
    });
  }

  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
          <GlobeIcon className="h-7 w-7 text-gray-400 dark:text-zinc-500" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
          No domains configured
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Add your first sending domain to get started.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSeed}
            isLoading={isPending}
            loadingText="Seeding..."
          >
            Seed Default Domains
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Add Domain
          </Button>
        </div>
        {seedError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {seedError}
          </p>
        )}

        {showAddForm && <AddDomainForm onClose={() => setShowAddForm(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setShowAddForm(true)}
          leftIcon={<PlusIcon className="h-4 w-4" />}
        >
          Add Domain
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
              {domains.map((domain) => (
                <tr
                  key={domain.id}
                  className="group transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                >
                  {/* Domain */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                        <GlobeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {domain.domain}
                      </span>
                    </div>
                  </td>

                  {/* Sender */}
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {domain.fromName}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-zinc-400">
                        {domain.fromEmail}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(domain.id)}
                      disabled={togglingId === domain.id || isPending}
                      className="disabled:opacity-50"
                    >
                      {domain.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-zinc-700 dark:text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          Inactive
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setEditingDomain(domain)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(domain.id, domain.domain)}
                        disabled={deletingId === domain.id || isPending}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        {deletingId === domain.id ? (
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

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {domains.length} {domains.length === 1 ? "domain" : "domains"} configured
          </p>
        </div>
      </div>

      {editingDomain && (
        <DomainForm
          domain={editingDomain}
          onClose={() => setEditingDomain(null)}
        />
      )}

      {showAddForm && <AddDomainForm onClose={() => setShowAddForm(false)} />}

      <Dialog />
    </div>
  );
}

// Icons
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
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
