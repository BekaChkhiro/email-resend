# Email Campaign App — Project Plan

## Project Overview
- **Project Name:** Email Campaign App
- **Description:** Full-stack email campaign management application with domain rotation, template versioning, AI-powered personalized email generation, and analytics tracking. Uses 5 verified Resend domains with round-robin distribution to optimize deliverability. Integrates OpenAI (ChatGPT) API for generating unique email content per contact based on their profile data.
- **Target Users:** Campaign Manager (single admin user)
- **Project Type:** Full-Stack Web App
- **Created:** 2026-03-04
- **Last Updated:** 2026-03-04
- **AI Provider:** OpenAI (ChatGPT) API
- **Status:** In Progress
- **Plugin Version:** 1.1.1

---

## Tech Stack
- **Frontend:** Next.js (App Router)
- **Backend:** Next.js API Routes / Server Actions
- **Database:** PostgreSQL
- **Email Provider:** Resend API
- **Authentication:** Password-based (simple)
- **Hosting:** Vercel
- **ORM:** Prisma (recommended for Next.js + PostgreSQL)
- **AI:** OpenAI API (ChatGPT) — personalized email generation

---

## Phase 1: Foundation & Setup

#### T1.1: Initialize Next.js Project
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **Dependencies**: None
- **Description**:
  - Create Next.js project with App Router
  - Configure TypeScript, ESLint, Tailwind CSS
  - Setup project folder structure (app/, components/, lib/, etc.)

#### T1.2: Setup Database & ORM
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.1
- **Description**:
  - Install and configure Prisma ORM
  - Define database schema for all 5 tables (domains, contacts, campaigns, campaign_templates, campaign_emails)
  - Create initial migration
  - Setup PostgreSQL connection

#### T1.3: Implement Authentication
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.1
- **Description**:
  - Implement simple password-based login page
  - Setup session management (JWT or cookie-based)
  - Add auth middleware to protect all routes
  - Create login UI page

#### T1.4: Create App Layout & Navigation
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **Dependencies**: T1.3
- **Description**:
  - Build main layout with sidebar/navigation
  - Add links: Dashboard, Contacts, Domains, Campaigns
  - Responsive design with Tailwind CSS

---

## Phase 2: Core Features — Domain & Contact Management

#### T2.1: Domain Management — CRUD & UI
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.2, T1.4
- **Description**:
  - Create Domains page listing all 5 domains
  - UI to configure from_name and from_email per domain
  - Toggle domain active/inactive status
  - Seed initial 5 domains in database

#### T2.2: Contact Management — Manual Add & List
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.2, T1.4
- **Description**:
  - Create Contacts page with contact list table
  - Add form for manual contact creation (first_name, last_name, email, company_name)
  - Edit and delete contacts
  - Show unsubscribe status per contact

#### T2.3: Contact Management — CSV Import
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T2.2
- **Description**:
  - Build CSV file upload component
  - Parse CSV (name, email, company columns)
  - Validate email format and handle duplicates
  - Bulk insert contacts into database
  - Show import results (success count, skipped, errors)

---

## Phase 3: Campaign System

#### T3.1: Campaign Creation — Basic Setup
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T2.1, T2.2
- **Description**:
  - Create Campaign form: name, subject line, email format (HTML/plain text), delay_seconds
  - Save campaign as 'draft' status
  - Campaign list page on Dashboard

#### T3.2: Campaign Templates — Multi-Version Editor
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.1
- **Description**:
  - Add template version editor to campaign creation
  - Support minimum 2-3 template versions per campaign
  - Template variables support: {{firstName}}, {{companyName}}, {{email}}
  - Preview template with sample data
  - Store templates in campaign_templates table with sort_order

#### T3.3: Contact Selection for Campaign
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.1, T2.2
- **Description**:
  - Add contact selection step to campaign creation
  - Select all contacts or filter
  - Exclude unsubscribed contacts automatically
  - Show selected contact count

#### T3.4: Sending Engine — Round-Robin Distribution
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.2, T3.3
- **Description**:
  - Implement domain round-robin assignment (contact #1 → domain1, #2 → domain2, ...)
  - Implement template version round-robin assignment
  - Replace template variables ({{firstName}}, {{companyName}}, {{email}})
  - Add unsubscribe link to every email
  - Create campaign_emails records with assigned domain_id and template_id

#### T3.5: Sending Engine — Resend API Integration
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.4
- **Description**:
  - Integrate Resend API for email sending
  - Send emails with configurable delay between each send
  - Use correct from address per assigned domain
  - Handle API errors and store error_message
  - Update campaign status (draft → sending → completed)
  - Store resend_id from API response

---

## Phase 3.5: AI-Powered Email Generation (ChatGPT Integration)

#### T3.6: OpenAI API Setup & Configuration
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **Dependencies**: T3.1
- **Description**:
  - Install `openai` npm package
  - Create `src/lib/openai.ts` with OpenAI client configuration
  - Add `OPENAI_API_KEY` to environment variables
  - Add AI settings to campaign model (prompt/instructions field)

#### T3.7: Database Schema Update for AI-Generated Emails
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.6
- **Description**:
  - Add `aiPrompt` field to Campaign model (instructions for AI generation)
  - Add `generatedBody` field to CampaignEmail model (stores AI-generated unique email body per contact)
  - Add `aiGenerated` boolean flag to CampaignEmail model
  - Create Prisma migration
  - Update sending engine to use `generatedBody` when available instead of template body

#### T3.8: AI Email Generation Engine
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.7
- **Description**:
  - Create `src/lib/ai-generate.ts` with email generation logic
  - Build system prompt that includes: campaign context (subject, purpose), contact data (name, title, company, industry, size, revenue, location, decisionMaker status)
  - Call OpenAI Chat Completions API (gpt-4o or gpt-4o-mini) for each contact
  - Handle rate limiting and API errors gracefully
  - Return generated email body as HTML or plain text based on campaign format
  - Estimated token usage tracking for cost awareness

#### T3.9: AI Generation UI — Campaign Prompt Editor
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.6
- **Description**:
  - Add "AI Prompt / Instructions" textarea to campaign detail page
  - User writes instructions like: "Write a cold outreach email for {{companyName}} about our SaaS product. Be personal, mention their industry and company size."
  - Save prompt to campaign's `aiPrompt` field
  - Show prompt preview with available contact data fields listed

#### T3.10: AI Generation UI — Batch Generate & Review
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.8, T3.9
- **Description**:
  - Add "Generate AI Emails" button to campaign detail page
  - On click: iterate selected contacts, call OpenAI API for each, save generated body to CampaignEmail records
  - Show progress bar during generation (X/Y contacts processed)
  - After generation: show list of generated emails with contact name + preview
  - Allow editing individual generated emails before sending
  - Allow re-generating specific emails (if user doesn't like the result)
  - Handle errors: show which contacts failed and allow retry

#### T3.11: Update Sending Engine for AI-Generated Emails
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.10
- **Description**:
  - Modify `prepareCampaignEmails` to check if AI-generated bodies exist
  - If `generatedBody` exists on CampaignEmail, use it instead of template body
  - Still apply unsubscribe link injection
  - Still apply domain round-robin for sender rotation
  - Ensure traditional template-based flow still works (backwards compatible)

---

## Phase 4: Tracking & Analytics

#### T4.1: Email Tracking Setup
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T3.5
- **Description**:
  - Setup Resend webhooks for email events (delivered, opened, clicked, bounced)
  - Create webhook endpoint to receive events
  - Update campaign_emails status based on webhook events
  - Store opened_at, clicked_at timestamps

#### T4.2: Unsubscribe Flow
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T3.5
- **Description**:
  - Generate unique unsubscribe links per contact
  - Create public unsubscribe endpoint (no auth required)
  - Mark contact as is_unsubscribed = true
  - Show confirmation page after unsubscribe

#### T4.3: Campaign Analytics Dashboard
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T4.1
- **Description**:
  - Build Campaign Detail page with analytics
  - Show metrics: sent count, open rate, click rate, bounce count, unsubscribed count
  - Per-email detail table with individual status
  - Dashboard overview with campaign list and summary stats

---

## Phase 5: Testing & Deployment

#### T5.1: End-to-End Testing
- [ ] **Status**: IN_PROGRESS 🔄
- **Complexity**: Medium
- **Dependencies**: T4.3
- **Description**:
  - Test complete sending flow with Resend test mode
  - Verify round-robin distribution for domains and templates
  - Test CSV import with edge cases
  - Test unsubscribe flow
  - Verify tracking webhook processing
  - Test AI email generation with various contact data completeness levels
  - Verify AI-generated emails can be edited and re-generated

#### T5.2: Deploy to Vercel
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T5.1
- **Description**:
  - Setup Vercel project and environment variables
  - Configure PostgreSQL (Vercel Postgres or external like Neon/Supabase)
  - Setup Resend API keys and webhook URLs
  - Deploy and verify production functionality

---

## Original Specification Analysis

**Source Document:** PROJECT_SPEC.md

### Extracted Requirements
- 5 verified Resend domains with round-robin email distribution
- Contact management with CSV import and manual entry
- Multi-version campaign templates with rotation
- Configurable delay between email sends
- Open/click tracking via Resend webhooks
- Unsubscribe link in every email
- Simple password-based authentication (single admin user)
- 6 UI pages: Login, Dashboard, Contacts, Domains, Campaign Create, Campaign Detail

### Database Schema
- Fully specified: 5 tables (domains, contacts, campaigns, campaign_templates, campaign_emails)
- All columns, types, and relationships defined in specification

### Clarifications Made
- Hosting: Vercel (user selected)
- ORM: Prisma (recommended, not in original spec)

### AI Integration (Phase 3.5) — Added 2026-03-04
- **Source:** User request — generate unique AI email per contact using ChatGPT
- **Approach:** Pre-Generate All — generate all emails before sending, save to DB, allow review/edit
- **API:** OpenAI Chat Completions (ChatGPT) — user has API key
- **Flow:** Campaign prompt → AI generates unique body per contact → Review → Edit if needed → Send via Resend
- **Contact data available for AI context:** firstName, lastName, title, companyName, companyIndustry, companySize, companyDescription, companyRevenue, companyFunding, companyType, location, region, country, decisionMaker
