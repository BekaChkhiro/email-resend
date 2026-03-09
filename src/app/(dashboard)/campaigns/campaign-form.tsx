"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createCampaign, updateCampaign } from "./actions";
import * as ct from "countries-and-timezones";
import { Button } from "@/components/ui";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  emailFormat: string;
  delaySeconds: number;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  sendStartHour: number | null;
  sendEndHour: number | null;
  sendDays: number[];
  timezone: string | null;
};

// Extra aliases for local languages and common abbreviations
const EXTRA_ALIASES: Record<string, string[]> = {
  "Asia/Tbilisi": ["საქართველო", "თბილისი"],
  "Europe/Moscow": ["россия", "москва"],
  "Asia/Tokyo": ["日本", "東京"],
  "Asia/Shanghai": ["中国", "北京", "上海"],
  "Asia/Seoul": ["한국", "서울"],
  "America/New_York": ["EST", "EDT", "Eastern"],
  "America/Los_Angeles": ["PST", "PDT", "Pacific"],
  "America/Chicago": ["CST", "CDT", "Central"],
  "America/Denver": ["MST", "MDT", "Mountain"],
  "Europe/London": ["GMT", "BST", "UK", "England"],
  "Asia/Kolkata": ["IST", "India"],
  "Asia/Dubai": ["GST", "Gulf"],
  "Australia/Sydney": ["AEST", "AEDT"],
};

// Build timezone list with metadata
type TimezoneOption = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  offset: string;
  offsetMinutes: number;
  abbr: string;
  searchText: string;
};

// Helper to get timezone abbreviation
function getTimezoneAbbr(tzName: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzName,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

// Build timezone options from the library
const TIMEZONE_OPTIONS: TimezoneOption[] = (() => {
  const timezones = ct.getAllTimezones();
  const options: TimezoneOption[] = [];

  for (const tz of Object.values(timezones)) {
    if (tz.aliasOf) continue; // Skip aliases

    const countryCode = tz.countries?.[0] || "";
    const countryData = countryCode ? ct.getCountry(countryCode) : null;
    const country = countryData?.name || "";
    const cityName = tz.name.split("/").pop()?.replace(/_/g, " ") || "";
    const abbr = getTimezoneAbbr(tz.name);
    const extraAliases = EXTRA_ALIASES[tz.name]?.join(" ") || "";

    // Build search text with multiple offset formats
    const offsetNum = tz.utcOffset / 60; // Convert to hours
    const offsetVariants = [
      tz.utcOffsetStr,
      `UTC${tz.utcOffsetStr}`,
      `GMT${tz.utcOffsetStr}`,
      `UTC${offsetNum >= 0 ? "+" : ""}${offsetNum}`,
      `GMT${offsetNum >= 0 ? "+" : ""}${offsetNum}`,
    ].join(" ");

    options.push({
      id: tz.name,
      name: tz.name,
      country,
      countryCode,
      offset: tz.utcOffsetStr,
      offsetMinutes: tz.utcOffset,
      abbr,
      searchText: `${tz.name} ${country} ${cityName} ${abbr} ${offsetVariants} ${extraAliases}`.toLowerCase(),
    });
  }

  return options.sort((a, b) => a.offsetMinutes - b.offsetMinutes);
})();

// Search function
function searchTimezones(query: string): TimezoneOption[] {
  if (!query) {
    return TIMEZONE_OPTIONS.slice(0, 50);
  }
  const q = query.toLowerCase();
  return TIMEZONE_OPTIONS.filter((tz) => tz.searchText.includes(q)).slice(0, 50);
}

// Get display info for a timezone
function getTimezoneDisplay(tzId: string): { label: string; detail: string } {
  const option = TIMEZONE_OPTIONS.find((o) => o.id === tzId);
  if (!option) return { label: tzId, detail: "" };

  return {
    label: option.name.replace(/_/g, " "),
    detail: `${option.abbr} (UTC${option.offset})${option.country ? ` · ${option.country}` : ""}`,
  };
}

// Generate hour options (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i.toString().padStart(2, "0") + ":00",
}));

// Days of week (0 = Sunday, 1 = Monday, etc.)
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

// Searchable Timezone Select Component
function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => searchTimezones(search), [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDisplay = value ? getTimezoneDisplay(value) : null;
  const displayValue = selectedDisplay
    ? `${selectedDisplay.label} · ${selectedDisplay.detail}`
    : "No scheduling (send anytime)";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
      >
        <span className={value ? "" : "text-gray-500 dark:text-zinc-400"} title={displayValue}>{displayValue}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 ${
                  !value ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "text-gray-500 dark:text-zinc-400"
                }`}
              >
                No scheduling (send anytime)
              </button>
            </li>
            {filtered.map((tz) => (
              <li key={tz.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(tz.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 ${
                    value === tz.id ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {tz.name.replace(/_/g, " ")}
                      {tz.country && (
                        <span className="ml-1 text-gray-400 dark:text-zinc-500">· {tz.country}</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-xs text-gray-400 dark:text-zinc-500">
                      UTC{tz.offset}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-zinc-400">No timezones found</li>
            )}
          </ul>
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="timezone" value={value} />
    </div>
  );
}

export default function CampaignForm({
  campaign,
  onClose,
}: {
  campaign?: Campaign;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState(campaign?.timezone ?? "");
  const [sendDays, setSendDays] = useState<number[]>(campaign?.sendDays ?? [1, 2, 3, 4, 5]);
  const isEditing = !!campaign;

  function toggleDay(day: number) {
    setSendDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateCampaign(campaign!.id, formData)
      : await createCampaign(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <MailIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? "Edit Campaign" : "New Campaign"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {isEditing ? campaign.name : "Configure your email campaign"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={campaign?.name}
              placeholder="e.g. Q1 Outreach"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={campaign?.subject}
              placeholder="e.g. Quick question about {{companyName}}"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="emailFormat" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Email Format <span className="text-red-500">*</span>
            </label>
            <select
              id="emailFormat"
              name="emailFormat"
              defaultValue={campaign?.emailFormat ?? "html"}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            >
              <option value="html">HTML</option>
              <option value="plain_text">Plain Text</option>
            </select>
          </div>

          <div>
            <label htmlFor="delaySeconds" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
              Delay Between Sends (seconds)
            </label>
            <input
              id="delaySeconds"
              name="delaySeconds"
              type="number"
              min="0"
              defaultValue={campaign?.delaySeconds ?? 0}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
              Time to wait between sending each email. 0 = no delay.
            </p>
          </div>

          {/* Scheduling Section */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              Send Schedule (Optional)
            </h3>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Timezone
              </label>
              <TimezoneSelect value={timezone} onChange={setTimezone} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sendStartHour" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  From Hour
                </label>
                <select
                  id="sendStartHour"
                  name="sendStartHour"
                  defaultValue={campaign?.sendStartHour ?? 9}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sendEndHour" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  To Hour
                </label>
                <select
                  id="sendEndHour"
                  name="sendEndHour"
                  defaultValue={campaign?.sendEndHour ?? 18}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Send Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      sendDays.includes(day.value)
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="sendDays" value={JSON.stringify(sendDays)} />
            </div>

            <p className="mt-3 text-xs text-gray-400 dark:text-zinc-500">
              Emails will only be sent during selected hours and days in the chosen timezone.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <AlertIcon className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} loadingText="Saving...">
              {isEditing ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}
