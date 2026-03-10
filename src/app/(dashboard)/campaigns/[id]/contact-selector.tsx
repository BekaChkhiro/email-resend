"use client";

import { useState, useMemo, useTransition } from "react";
import { updateSelectedContacts } from "./actions";
import { Button } from "@/components/ui";

interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  isUnsubscribed: boolean;
  emailStatus: string | null;
}

interface ContactSelectorProps {
  campaignId: string;
  contacts: Contact[];
  initialSelectedIds: string[];
  readOnly: boolean;
}

export default function ContactSelector({
  campaignId,
  contacts,
  initialSelectedIds,
  readOnly,
}: ContactSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds)
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Only show contacts that are subscribed AND have valid email status
  const availableContacts = useMemo(
    () => contacts.filter((c) => !c.isUnsubscribed && c.emailStatus === 'valid'),
    [contacts]
  );

  // Count excluded contacts
  const unsubscribedCount = contacts.filter(c => c.isUnsubscribed).length;
  const invalidEmailCount = contacts.filter(c => !c.isUnsubscribed && c.emailStatus !== 'valid').length;

  const filtered = useMemo(() => {
    if (!search.trim()) return availableContacts;
    const q = search.toLowerCase();
    return availableContacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q))
    );
  }, [availableContacts, search]);

  const hasChanges =
    selectedIds.size !== initialSelectedIds.length ||
    initialSelectedIds.some((id) => !selectedIds.has(id));

  function toggleContact(id: string) {
    if (readOnly) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (readOnly) return;
    setSelectedIds(new Set(availableContacts.map((c) => c.id)));
  }

  function deselectAll() {
    if (readOnly) return;
    setSelectedIds(new Set());
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateSelectedContacts(
        campaignId,
        Array.from(selectedIds)
      );
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Contact selection saved." });
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Contact Selection
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedIds.size} of {availableContacts.length} contacts selected
        </span>
      </div>

      {(unsubscribedCount > 0 || invalidEmailCount > 0) && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {unsubscribedCount > 0 && (
            <span>{unsubscribedCount} unsubscribed</span>
          )}
          {unsubscribedCount > 0 && invalidEmailCount > 0 && <span> and </span>}
          {invalidEmailCount > 0 && (
            <span>{invalidEmailCount} non-valid email{invalidEmailCount !== 1 ? "s" : ""}</span>
          )}
          {" "}automatically excluded.
        </p>
      )}

      {message && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
          <Button variant="secondary" type="button" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="secondary" type="button" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
      )}

      <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {availableContacts.length === 0
              ? "No subscribed contacts available. Add contacts first."
              : "No contacts match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                {!readOnly && <th className="w-10 px-3 py-2" />}
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`${!readOnly ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" : ""} ${
                    selectedIds.has(contact.id) ? "bg-emerald-50 dark:bg-emerald-900/30" : ""
                  }`}
                >
                  {!readOnly && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{contact.email}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    {contact.companyName || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            isLoading={isPending}
            loadingText="Saving..."
          >
            Save Selection
          </Button>
        </div>
      )}
    </div>
  );
}
