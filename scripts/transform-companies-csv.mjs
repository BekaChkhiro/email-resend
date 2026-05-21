#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const INPUT = process.argv[2];
const OUTPUT = process.argv[3];

if (!INPUT || !OUTPUT) {
  console.error("Usage: node transform-companies-csv.mjs <input.csv> <output.csv>");
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const raw = fs.readFileSync(INPUT, "utf8");
const lines = raw.split(/\r?\n/);

// Skip first 2 metadata lines, header is on row 3 (index 2)
const headerLine = lines[2];
if (!headerLine) {
  console.error("Could not find header on line 3.");
  process.exit(1);
}
const headers = parseCsvLine(headerLine);

// Map Georgian → field index
const idx = {
  name: headers.indexOf("სრული სახელი"),
  status: headers.indexOf("იურ. სტატუსი"),
  idCode: headers.indexOf("ID კოდი"),
  country: headers.indexOf("ქვეყანა"),
  city: headers.indexOf("ქალაქი"),
  address: headers.indexOf("მისამართი"),
  phone: headers.indexOf("ტელეფონი"),
  email: headers.indexOf("ელ-ფოსტა"),
  website: headers.indexOf("ვებგვერდი"),
  role: headers.indexOf("როლი"),
  contactPersons: headers.indexOf("საკონტ. პირები"),
};

if (idx.email === -1 || idx.name === -1) {
  console.error("Required columns not found. Headers:", headers);
  process.exit(1);
}

// Output headers — match system's CSV_TO_DB_MAP exactly
const outHeaders = [
  "email",
  "first_name",
  "last_name",
  "company",
  "title",
  "country",
  "locality",
  "location",
  "domain",
  "list_name",
];

const outRows = [outHeaders.join(",")];
const seenEmails = new Set();
let kept = 0;
let skippedNoEmail = 0;
let skippedDup = 0;
let skippedInvalidEmail = 0;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

for (let i = 3; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCsvLine(line);

  const email = (cols[idx.email] || "").toLowerCase().trim();
  const name = (cols[idx.name] || "").trim();
  const status = (cols[idx.status] || "").trim() || "კომპანია";

  if (!email) {
    skippedNoEmail++;
    continue;
  }
  if (!EMAIL_RE.test(email)) {
    skippedInvalidEmail++;
    continue;
  }
  if (seenEmails.has(email)) {
    skippedDup++;
    continue;
  }
  seenEmails.add(email);

  let website = (cols[idx.website] || "").trim();
  if (website) {
    website = website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  }

  const row = [
    email,
    name || "კომპანია",
    status,
    name,
    cols[idx.role] || "",
    cols[idx.country] || "",
    cols[idx.city] || "",
    cols[idx.address] || "",
    website,
    "Companies Import",
  ];

  outRows.push(row.map(csvEscape).join(","));
  kept++;
}

fs.writeFileSync(OUTPUT, outRows.join("\n"), "utf8");

console.log(`✅ Transformed: ${OUTPUT}`);
console.log(`   Kept:                  ${kept}`);
console.log(`   Skipped (no email):    ${skippedNoEmail}`);
console.log(`   Skipped (bad email):   ${skippedInvalidEmail}`);
console.log(`   Skipped (duplicates):  ${skippedDup}`);
