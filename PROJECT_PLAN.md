# Email Campaign App — Project Plan

## Project Overview
- **Project Name:** Email Campaign App
- **Description:** Full-stack email campaign management application with domain rotation, template versioning, AI-powered personalized email generation, and analytics tracking. Uses 5 verified Resend domains with round-robin distribution to optimize deliverability. Integrates OpenAI (ChatGPT) API for generating unique email content per contact based on their profile data.
- **Target Users:** Campaign Manager (single admin user)
- **Project Type:** Full-Stack Web App
- **Created:** 2026-03-04
- **Last Updated:** 2026-03-09
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

---

## Phase 6: MCP Server — Core Setup

#### T6.1: Initialize MCP Server Project Structure
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T1.2
- **Description**:
  - Create `mcp-server/` directory
  - Initialize package.json with dependencies (@modelcontextprotocol/sdk, zod, dotenv)
  - Setup tsconfig.json for ES2022/NodeNext
  - Create src/ folder structure (tools/, utils/, transports/, schemas/, resources/)

#### T6.2: Configure Prisma Client Integration
- [x] **Status**: DONE ✅
- **Complexity**: Low
- **Dependencies**: T6.1
- **Description**:
  - Create src/utils/db.ts
  - Import existing Prisma client from parent project
  - Setup connection pooling
  - Add connection error handling

#### T6.3: Implement Base MCP Server
- [x] **Status**: DONE ✅
- **Complexity**: High
- **Dependencies**: T6.2
- **Description**:
  - Create src/server.ts with MCP Server class
  - Register tool handlers
  - Setup capability negotiation
  - Implement server info endpoint

#### T6.4: Implement stdio Transport
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T6.3
- **Description**:
  - Create src/transports/stdio.ts
  - Handle stdin/stdout streams
  - Implement JSON-RPC message parsing
  - Add graceful shutdown handling

#### T6.5: Setup Error Handling Utilities
- [x] **Status**: DONE ✅
- **Complexity**: Medium
- **Dependencies**: T6.1
- **Description**:
  - Create src/utils/errors.ts
  - Define McpErrorCode enum
  - Implement ToolError class
  - Create error response formatter

#### T6.6: Create Entry Point with Mode Selection
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T6.4
- **Description**:
  - Create src/index.ts
  - Parse CLI arguments (--stdio, --http)
  - Initialize appropriate transport
  - Add environment variable loading

---

## Phase 7: MCP Server — Contact Tools

#### T7.1: Create Contacts Zod Schemas
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T6.5
- **Description**:
  - Create src/schemas/contacts.ts
  - Define ContactCreateSchema with all fields
  - Define ContactUpdateSchema (partial)
  - Define ContactListFiltersSchema
  - Add validation error messages

#### T7.2: Implement contacts_list Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T7.1
- **Description**:
  - Create src/tools/contacts.ts
  - Implement search (email, name, company)
  - Add country and industry filters
  - Implement pagination (limit, offset)
  - Return total count and hasMore flag

#### T7.3: Implement contacts_get Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T7.2
- **Description**:
  - Get contact by ID
  - Include related campaign emails count
  - Return null if not found

#### T7.4: Implement contacts_create Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T7.1
- **Description**:
  - Validate input with Zod schema
  - Check for duplicate email
  - Create contact in database
  - Return created contact or error

#### T7.5: Implement contacts_update Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T7.4
- **Description**:
  - Validate partial input
  - Check contact exists
  - Update only provided fields
  - Return updated contact

#### T7.6: Implement contacts_delete Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T7.3
- **Description**:
  - Check contact exists
  - Handle cascade delete considerations
  - Return success/failure

#### T7.7: Implement contacts_bulk_create Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T7.4
- **Description**:
  - Accept array of contacts (max 100)
  - Validate each contact
  - Skip duplicates if flag set
  - Use transaction for batch insert
  - Return created/skipped counts and errors

---

## Phase 8: MCP Server — Campaign Tools

#### T8.1: Create Campaigns Zod Schemas
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T6.5
- **Description**:
  - Create src/schemas/campaigns.ts
  - Define CampaignCreateSchema
  - Define CampaignUpdateSchema
  - Add schedule validation (hours, days, timezone)

#### T8.2: Implement campaigns_list Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.1
- **Description**:
  - Create src/tools/campaigns.ts
  - Filter by status (draft, sending, completed, paused)
  - Implement pagination
  - Include basic stats (email counts)

#### T8.3: Implement campaigns_get Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.2
- **Description**:
  - Get campaign by ID
  - Include templates
  - Calculate stats (sent, delivered, opened, clicked, bounced)
  - Return detailed campaign object

#### T8.4: Implement campaigns_create Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.1
- **Description**:
  - Validate input
  - Set default status to 'draft'
  - Validate timezone if provided
  - Validate sendDays array
  - Return created campaign

#### T8.5: Implement campaigns_update Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.4
- **Description**:
  - Validate partial input
  - Prevent updating completed campaigns
  - Handle status transitions
  - Return updated campaign

#### T8.6: Implement campaigns_delete Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T8.3
- **Description**:
  - Check campaign exists
  - Prevent deleting active campaigns
  - Cascade delete templates and emails
  - Return success

#### T8.7: Implement campaigns_add_contacts Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.3
- **Description**:
  - Validate campaign exists and is draft
  - Validate all contact IDs exist
  - Add to selectedContactIds array
  - Prevent duplicates
  - Return total contacts count

#### T8.8: Implement campaigns_remove_contacts Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T8.7
- **Description**:
  - Remove contact IDs from array
  - Return remaining contacts count

#### T8.9: Implement campaigns_prepare Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T8.7
- **Description**:
  - Validate campaign has contacts
  - Validate campaign has templates
  - Get active domains
  - Create CampaignEmail records
  - Round-robin domain and template assignment
  - Return emails created count

#### T8.10: Implement campaigns_start Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.9
- **Description**:
  - Validate campaign is prepared
  - Check pending emails exist
  - Set status to 'sending'
  - Set sentAt timestamp
  - Return updated campaign

#### T8.11: Implement campaigns_pause Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T8.10
- **Description**:
  - Validate campaign is sending
  - Set status to 'paused'
  - Return updated campaign

#### T8.12: Implement campaigns_stats Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T8.3
- **Description**:
  - Calculate overview stats
  - Calculate percentage rates
  - Group stats by domain
  - Generate timeline data
  - Return comprehensive stats object

---

## Phase 9: MCP Server — Template & Domain Tools

#### T9.1: Implement templates_list Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T6.3
- **Description**:
  - Create src/tools/templates.ts
  - Get templates by campaign ID
  - Order by sortOrder
  - Return template array

#### T9.2: Implement templates_create Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T9.1
- **Description**:
  - Validate campaign exists and is draft
  - Auto-assign sortOrder if not provided
  - Return created template

#### T9.3: Implement templates_update Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T9.2
- **Description**:
  - Validate template exists
  - Update provided fields
  - Return updated template

#### T9.4: Implement templates_delete Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T9.1
- **Description**:
  - Validate template exists
  - Delete template
  - Return success

#### T9.5: Implement domains_list Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T6.3
- **Description**:
  - Create src/tools/domains.ts
  - Filter by isActive and warmupEnabled
  - Return domain array

#### T9.6: Implement domains_get Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T9.5
- **Description**:
  - Get domain by ID
  - Calculate stats (totalEmailsSent, deliveryRate, bounceRate)
  - Return domain with stats

#### T9.7: Implement domains_add Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T9.5
- **Description**:
  - Validate domain format
  - Check for duplicate domain
  - Validate fromEmail matches domain
  - Return created domain

#### T9.8: Implement domains_update Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T9.7
- **Description**:
  - Update fromName and/or fromEmail
  - Return updated domain

#### T9.9: Implement domains_delete Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T9.6
- **Description**:
  - Check domain not in use by active campaigns
  - Delete domain
  - Return success

#### T9.10: Implement domains_toggle_active Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T9.5
- **Description**:
  - Toggle isActive flag
  - Return updated domain

---

## Phase 10: MCP Server — Warmup Tools

#### T10.1: Implement warmup_start Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T9.6
- **Description**:
  - Create src/tools/warmup.ts
  - Set warmupEnabled = true
  - Set warmupStartedAt to now
  - Reset warmupDay to 1
  - Return updated domain

#### T10.2: Implement warmup_stop Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T10.1
- **Description**:
  - Set warmupEnabled = false
  - Return updated domain

#### T10.3: Implement warmup_reset Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T10.1
- **Description**:
  - Reset all warmup fields
  - Set warmupDay = 0
  - Clear timestamps
  - Return updated domain

#### T10.4: Implement warmup_status Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T10.1
- **Description**:
  - Get domain warmup state
  - Calculate dailyLimit based on warmupDay
  - Count totalSent from WarmupEmail
  - Return detailed status object

#### T10.5: Implement warmup_overview Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T10.4
- **Description**:
  - Get all domains with warmup data
  - Calculate progress percentage
  - Count totalActive and totalCompleted
  - Return overview object

---

## Phase 11: MCP Server — Inbox Tools

#### T11.1: Implement inbox_conversations Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T6.3
- **Description**:
  - Create src/tools/inbox.ts
  - Group messages by contact and campaign
  - Get last message preview
  - Count unread and total messages
  - Implement pagination and status filter

#### T11.2: Implement inbox_messages Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T11.1
- **Description**:
  - Get messages for contact
  - Optionally filter by campaign
  - Order by receivedAt
  - Include attachments

#### T11.3: Implement inbox_reply Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T11.2
- **Description**:
  - Validate contact exists
  - Get domain for reply
  - Send email via Resend API
  - Create InboxMessage record
  - Set direction to 'outbound'

#### T11.4: Implement inbox_mark_read Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T11.1
- **Description**:
  - Update messages status to 'read'
  - Filter by contact and optional campaign
  - Return count of marked messages

#### T11.5: Implement inbox_mark_unread Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T11.4
- **Description**:
  - Update single message status to 'unread'
  - Return success

#### T11.6: Implement inbox_archive Tool
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T11.4
- **Description**:
  - Update messages status to 'archived'
  - Return archived count

#### T11.7: Implement inbox_stats Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T11.1
- **Description**:
  - Count total messages
  - Count by status
  - Count today's received
  - Return stats object

---

## Phase 12: MCP Server — Analytics Tools

#### T12.1: Implement analytics_overview Tool
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T8.12
- **Description**:
  - Create src/tools/analytics.ts
  - Calculate contacts stats (total, added, unsubscribed)
  - Calculate campaigns stats (total, active, completed, draft)
  - Calculate emails stats
  - Support period filter (7d, 30d, 90d, all)

#### T12.2: Implement analytics_campaign_comparison Tool
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T8.12
- **Description**:
  - Accept array of campaign IDs
  - Calculate rates for each
  - Return comparison data

---

## Phase 13: MCP Server — HTTP Transport & Auth

#### T13.1: Implement HTTP/SSE Transport
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T6.4
- **Description**:
  - Create src/transports/http.ts
  - Setup HTTP server
  - Implement SSE for streaming
  - Handle CORS
  - Parse JSON-RPC requests

#### T13.2: Implement API Key Authentication
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T13.1
- **Description**:
  - Create src/auth.ts
  - Validate X-API-Key header
  - Support Bearer token format
  - Reject unauthorized requests

#### T13.3: Implement Rate Limiting
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T13.2
- **Description**:
  - Track requests per API key
  - Implement sliding window
  - Return 429 when exceeded
  - Add rate limit headers

---

## Phase 14: MCP Server — Resources

#### T14.1: Implement Resource Handler
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T6.3
- **Description**:
  - Create src/resources/index.ts
  - Register resource URIs
  - Implement resource read handler

#### T14.2: Implement contacts/all Resource
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T14.1
- **Description**:
  - Return all contacts as JSON
  - Limit to 1000 for performance

#### T14.3: Implement campaigns/active Resource
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T14.1
- **Description**:
  - Return campaigns with status 'sending'
  - Include basic stats

#### T14.4: Implement domains/warmup Resource
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T14.1
- **Description**:
  - Return domains with warmupEnabled = true

#### T14.5: Implement inbox/unread Resource
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T14.1
- **Description**:
  - Return messages with status 'unread'
  - Limit to 100

#### T14.6: Implement analytics/today Resource
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T14.1
- **Description**:
  - Return today's email statistics

---

## Phase 15: MCP Server — Testing & Documentation

#### T15.1: Setup Jest Testing Framework
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T6.6
- **Description**:
  - Add jest and @types/jest
  - Configure jest.config.js
  - Setup test database
  - Create test utilities

#### T15.2: Write Unit Tests for Contact Tools
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T15.1, T7.7
- **Description**:
  - Test contacts_list with filters
  - Test contacts_create validation
  - Test contacts_bulk_create
  - Test error cases

#### T15.3: Write Unit Tests for Campaign Tools
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T15.1, T8.12
- **Description**:
  - Test campaign lifecycle
  - Test campaigns_prepare
  - Test campaigns_stats calculations

#### T15.4: Write Integration Tests
- [ ] **Status**: TODO
- **Complexity**: High
- **Dependencies**: T15.2, T15.3
- **Description**:
  - Test full campaign flow
  - Test MCP protocol compliance
  - Test HTTP transport
  - Test authentication

#### T15.5: Create README.md Documentation
- [ ] **Status**: TODO
- **Complexity**: Medium
- **Dependencies**: T14.6
- **Description**:
  - Write installation guide
  - Document all tools with examples
  - Add Claude Desktop/Code config examples
  - Add HTTP API examples

#### T15.6: Create Usage Examples
- [ ] **Status**: TODO
- **Complexity**: Low
- **Dependencies**: T15.5
- **Description**:
  - Create examples/ directory
  - Add contact management example
  - Add campaign flow example
  - Add inbox management example

---

## Progress Summary

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 1: Foundation & Setup | 4 | 4 | 100% |
| Phase 2: Domain & Contact Management | 3 | 3 | 100% |
| Phase 3: Campaign System | 5 | 5 | 100% |
| Phase 3.5: AI Email Generation | 6 | 6 | 100% |
| Phase 4: Tracking & Analytics | 3 | 3 | 100% |
| Phase 5: Testing & Deployment | 2 | 0 | 0% |
| **Phase 6: MCP Core Setup** | 6 | 5 | 83% |
| **Phase 7: MCP Contact Tools** | 7 | 0 | 0% |
| **Phase 8: MCP Campaign Tools** | 12 | 0 | 0% |
| **Phase 9: MCP Template & Domain Tools** | 10 | 0 | 0% |
| **Phase 10: MCP Warmup Tools** | 5 | 0 | 0% |
| **Phase 11: MCP Inbox Tools** | 7 | 0 | 0% |
| **Phase 12: MCP Analytics Tools** | 2 | 0 | 0% |
| **Phase 13: MCP HTTP & Auth** | 3 | 0 | 0% |
| **Phase 14: MCP Resources** | 6 | 0 | 0% |
| **Phase 15: MCP Testing & Docs** | 6 | 0 | 0% |
| **Total** | **87** | **26** | **30%** |

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
