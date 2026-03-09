"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createCampaign, updateCampaign } from "./actions";
import * as ct from "countries-and-timezones";

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
        className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className={value ? "" : "text-gray-500"} title={displayValue}>{displayValue}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  !value ? "bg-blue-50 text-blue-700" : "text-gray-500"
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
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    value === tz.id ? "bg-blue-50 text-blue-700" : "text-gray-900"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {tz.name.replace(/_/g, " ")}
                      {tz.country && (
                        <span className="ml-1 text-gray-400">· {tz.country}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      UTC{tz.offset}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No timezones found</li>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? `Edit Campaign` : "New Campaign"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Campaign Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={campaign?.name}
              placeholder="e.g. Q1 Outreach"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject Line *
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={campaign?.subject}
              placeholder="e.g. Quick question about {{companyName}}"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="emailFormat" className="block text-sm font-medium text-gray-700">
              Email Format *
            </label>
            <select
              id="emailFormat"
              name="emailFormat"
              defaultValue={campaign?.emailFormat ?? "html"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="html">HTML</option>
              <option value="plain_text">Plain Text</option>
            </select>
          </div>

          <div>
            <label htmlFor="delaySeconds" className="block text-sm font-medium text-gray-700">
              Delay Between Sends (seconds)
            </label>
            <input
              id="delaySeconds"
              name="delaySeconds"
              type="number"
              min="0"
              defaultValue={campaign?.delaySeconds ?? 0}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Time to wait between sending each email. 0 = no delay.
            </p>
          </div>

          {/* Scheduling Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Send Schedule (Optional)</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <TimezoneSelect value={timezone} onChange={setTimezone} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sendStartHour" className="block text-sm font-medium text-gray-700">
                  From Hour
                </label>
                <select
                  id="sendStartHour"
                  name="sendStartHour"
                  defaultValue={campaign?.sendStartHour ?? 9}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sendEndHour" className="block text-sm font-medium text-gray-700">
                  To Hour
                </label>
                <select
                  id="sendEndHour"
                  name="sendEndHour"
                  defaultValue={campaign?.sendEndHour ?? 18}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                      sendDays.includes(day.value)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="sendDays" value={JSON.stringify(sendDays)} />
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Emails will only be sent during selected hours and days in the chosen timezone.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Campaign"
                  : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
