# MCP Server Implementation Plan
## Email Campaign Management Platform

---

## 1. პროექტის სტრუქტურა

```
email-resend/
├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts                 # Entry point (stdio/http mode selection)
│   │   ├── server.ts                # MCP Server setup & configuration
│   │   ├── auth.ts                  # API Key authentication
│   │   ├── transports/
│   │   │   ├── stdio.ts             # stdio transport (local)
│   │   │   └── http.ts              # HTTP/SSE transport (remote)
│   │   ├── tools/
│   │   │   ├── index.ts             # Tool registry
│   │   │   ├── contacts.ts          # Contact management tools
│   │   │   ├── campaigns.ts         # Campaign management tools
│   │   │   ├── templates.ts         # Template management tools
│   │   │   ├── domains.ts           # Domain management tools
│   │   │   ├── warmup.ts            # Warmup management tools
│   │   │   ├── inbox.ts             # Inbox management tools
│   │   │   └── analytics.ts         # Statistics & analytics tools
│   │   ├── resources/
│   │   │   └── index.ts             # MCP Resources (read-only data)
│   │   ├── schemas/
│   │   │   ├── contacts.ts          # Zod schemas for contacts
│   │   │   ├── campaigns.ts         # Zod schemas for campaigns
│   │   │   └── ...
│   │   └── utils/
│   │       ├── db.ts                # Prisma client initialization
│   │       ├── errors.ts            # Error handling utilities
│   │       └── validation.ts        # Input validation helpers
│   └── dist/                        # Compiled output
└── ... (existing Next.js app)
```

---

## 2. Dependencies

```json
{
  "name": "email-campaign-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "start:stdio": "node dist/index.js --stdio",
    "start:http": "node dist/index.js --http",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@prisma/client": "^7.4.2",
    "zod": "^3.23.0",
    "dotenv": "^17.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "tsx": "^4.21.0"
  }
}
```

---

## 3. Tools სპეციფიკაცია

### 3.1 Contacts Tools

#### `contacts_list`
კონტაქტების სიის მიღება ფილტრებით და pagination-ით.

```typescript
// Input Schema
{
  search?: string;        // ძიება (email, name, company)
  country?: string;       // ქვეყნის ფილტრი
  industry?: string;      // ინდუსტრიის ფილტრი
  isUnsubscribed?: boolean;
  limit?: number;         // default: 50, max: 200
  offset?: number;        // default: 0
}

// Output
{
  contacts: Contact[];
  total: number;
  hasMore: boolean;
}
```

#### `contacts_get`
კონკრეტული კონტაქტის მიღება ID-ით.

```typescript
// Input
{ id: string }

// Output
Contact | null
```

#### `contacts_create`
ახალი კონტაქტის შექმნა.

```typescript
// Input
{
  email: string;          // required, unique
  firstName: string;      // required
  lastName: string;       // required
  title?: string;
  companyName?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companySize?: number;
  country?: string;
  linkedin?: string;
  // ... other optional fields
}

// Output
{ success: true; contact: Contact } | { success: false; error: string }
```

#### `contacts_update`
კონტაქტის განახლება.

```typescript
// Input
{
  id: string;             // required
  // ... any updatable fields
}

// Output
{ success: true; contact: Contact } | { success: false; error: string }
```

#### `contacts_delete`
კონტაქტის წაშლა.

```typescript
// Input
{ id: string }

// Output
{ success: true } | { success: false; error: string }
```

#### `contacts_bulk_create`
მრავალი კონტაქტის ერთდროულად შექმნა.

```typescript
// Input
{
  contacts: ContactCreateInput[];  // max 100
  skipDuplicates?: boolean;        // default: true
}

// Output
{
  created: number;
  skipped: number;
  errors: { email: string; error: string }[];
}
```

---

### 3.2 Campaigns Tools

#### `campaigns_list`
კამპანიების სიის მიღება.

```typescript
// Input
{
  status?: 'draft' | 'sending' | 'completed' | 'paused';
  limit?: number;
  offset?: number;
}

// Output
{
  campaigns: Campaign[];
  total: number;
}
```

#### `campaigns_get`
კონკრეტული კამპანიის დეტალები.

```typescript
// Input
{ id: string }

// Output
Campaign & {
  templates: CampaignTemplate[];
  stats: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  }
}
```

#### `campaigns_create`
ახალი კამპანიის შექმნა.

```typescript
// Input
{
  name: string;
  subject: string;
  emailFormat?: 'html' | 'plain_text';
  delaySeconds?: number;
  sendStartHour?: number;      // 0-23
  sendEndHour?: number;        // 0-23
  sendDays?: number[];         // [1,2,3,4,5] = Mon-Fri
  timezone?: string;           // e.g., "Europe/Tbilisi"
}

// Output
{ success: true; campaign: Campaign }
```

#### `campaigns_update`
კამპანიის განახლება.

```typescript
// Input
{
  id: string;
  name?: string;
  subject?: string;
  status?: 'draft' | 'sending' | 'paused';
  // ... other fields
}

// Output
{ success: true; campaign: Campaign }
```

#### `campaigns_delete`
კამპანიის წაშლა.

```typescript
// Input
{ id: string }

// Output
{ success: true }
```

#### `campaigns_add_contacts`
კამპანიაში კონტაქტების დამატება.

```typescript
// Input
{
  campaignId: string;
  contactIds: string[];
}

// Output
{ success: true; totalContacts: number }
```

#### `campaigns_remove_contacts`
კამპანიიდან კონტაქტების წაშლა.

```typescript
// Input
{
  campaignId: string;
  contactIds: string[];
}

// Output
{ success: true; totalContacts: number }
```

#### `campaigns_prepare`
კამპანიის მომზადება გაგზავნისთვის (CampaignEmail records-ის შექმნა).

```typescript
// Input
{ campaignId: string }

// Output
{
  success: true;
  emailsCreated: number;
  domainsUsed: string[];
}
```

#### `campaigns_start`
კამპანიის გაშვება (status -> sending).

```typescript
// Input
{ campaignId: string }

// Output
{ success: true; campaign: Campaign }
```

#### `campaigns_pause`
კამპანიის პაუზა.

```typescript
// Input
{ campaignId: string }

// Output
{ success: true; campaign: Campaign }
```

#### `campaigns_stats`
კამპანიის დეტალური სტატისტიკა.

```typescript
// Input
{ campaignId: string }

// Output
{
  overview: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    pending: number;
  };
  rates: {
    deliveryRate: number;    // %
    openRate: number;        // %
    clickRate: number;       // %
    bounceRate: number;      // %
  };
  byDomain: {
    domain: string;
    sent: number;
    delivered: number;
    bounced: number;
  }[];
  timeline: {
    date: string;
    sent: number;
    opened: number;
  }[];
}
```

---

### 3.3 Templates Tools

#### `templates_list`
კამპანიის შაბლონების სია.

```typescript
// Input
{ campaignId: string }

// Output
CampaignTemplate[]
```

#### `templates_create`
ახალი შაბლონის შექმნა.

```typescript
// Input
{
  campaignId: string;
  versionName: string;
  body: string;
  sortOrder?: number;
}

// Output
{ success: true; template: CampaignTemplate }
```

#### `templates_update`
შაბლონის განახლება.

```typescript
// Input
{
  id: string;
  versionName?: string;
  body?: string;
  sortOrder?: number;
}

// Output
{ success: true; template: CampaignTemplate }
```

#### `templates_delete`
შაბლონის წაშლა.

```typescript
// Input
{ id: string }

// Output
{ success: true }
```

---

### 3.4 Domains Tools

#### `domains_list`
დომენების სია.

```typescript
// Input
{
  isActive?: boolean;
  warmupEnabled?: boolean;
}

// Output
Domain[]
```

#### `domains_get`
კონკრეტული დომენის ინფორმაცია.

```typescript
// Input
{ id: string }

// Output
Domain & {
  stats: {
    totalEmailsSent: number;
    deliveryRate: number;
    bounceRate: number;
  }
}
```

#### `domains_add`
ახალი დომენის დამატება.

```typescript
// Input
{
  domain: string;
  fromName: string;
  fromEmail: string;
}

// Output
{ success: true; domain: Domain }
```

#### `domains_update`
დომენის განახლება.

```typescript
// Input
{
  id: string;
  fromName?: string;
  fromEmail?: string;
}

// Output
{ success: true; domain: Domain }
```

#### `domains_delete`
დომენის წაშლა.

```typescript
// Input
{ id: string }

// Output
{ success: true }
```

#### `domains_toggle_active`
დომენის გააქტიურება/გამორთვა.

```typescript
// Input
{
  id: string;
  isActive: boolean;
}

// Output
{ success: true; domain: Domain }
```

---

### 3.5 Warmup Tools

#### `warmup_start`
დომენის warmup-ის დაწყება.

```typescript
// Input
{ domainId: string }

// Output
{ success: true; domain: Domain }
```

#### `warmup_stop`
Warmup-ის შეჩერება.

```typescript
// Input
{ domainId: string }

// Output
{ success: true; domain: Domain }
```

#### `warmup_reset`
Warmup-ის გადატვირთვა (თავიდან დაწყება).

```typescript
// Input
{ domainId: string }

// Output
{ success: true; domain: Domain }
```

#### `warmup_status`
Warmup-ის მიმდინარე სტატუსი.

```typescript
// Input
{ domainId: string }

// Output
{
  enabled: boolean;
  day: number;
  sentToday: number;
  dailyLimit: number;
  totalSent: number;
  startedAt: string | null;
  completedAt: string | null;
}
```

#### `warmup_overview`
ყველა დომენის warmup overview.

```typescript
// Input: none

// Output
{
  domains: {
    id: string;
    domain: string;
    warmupEnabled: boolean;
    warmupDay: number;
    sentToday: number;
    dailyLimit: number;
    progress: number;  // %
  }[];
  totalActive: number;
  totalCompleted: number;
}
```

---

### 3.6 Inbox Tools

#### `inbox_conversations`
საუბრების სია.

```typescript
// Input
{
  status?: 'unread' | 'read' | 'archived';
  campaignId?: string;
  limit?: number;
  offset?: number;
}

// Output
{
  conversations: {
    contactId: string;
    contactEmail: string;
    contactName: string;
    campaignId: string | null;
    campaignName: string | null;
    lastMessage: {
      subject: string;
      preview: string;
      direction: 'inbound' | 'outbound';
      receivedAt: string;
    };
    unreadCount: number;
    totalMessages: number;
  }[];
  total: number;
}
```

#### `inbox_messages`
კონკრეტული საუბრის მესიჯები.

```typescript
// Input
{
  contactId: string;
  campaignId?: string;
  limit?: number;
}

// Output
InboxMessage[]
```

#### `inbox_reply`
პასუხის გაგზავნა.

```typescript
// Input
{
  contactId: string;
  campaignId?: string;
  inReplyToMessageId?: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

// Output
{ success: true; message: InboxMessage }
```

#### `inbox_mark_read`
წაკითხულად მონიშვნა.

```typescript
// Input
{
  contactId: string;
  campaignId?: string;
}

// Output
{ success: true; markedCount: number }
```

#### `inbox_mark_unread`
წაუკითხავად მონიშვნა.

```typescript
// Input
{ messageId: string }

// Output
{ success: true }
```

#### `inbox_archive`
საუბრის დაარქივება.

```typescript
// Input
{
  contactId: string;
  campaignId?: string;
}

// Output
{ success: true; archivedCount: number }
```

#### `inbox_stats`
Inbox-ის სტატისტიკა.

```typescript
// Input: none

// Output
{
  total: number;
  unread: number;
  read: number;
  archived: number;
  todayReceived: number;
}
```

---

### 3.7 Analytics Tools

#### `analytics_overview`
მთლიანი სისტემის overview.

```typescript
// Input
{
  period?: '7d' | '30d' | '90d' | 'all';
}

// Output
{
  contacts: {
    total: number;
    addedThisPeriod: number;
    unsubscribed: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    draft: number;
  };
  emails: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    avgOpenRate: number;
    avgClickRate: number;
  };
  domains: {
    total: number;
    active: number;
    warmingUp: number;
  };
}
```

#### `analytics_campaign_comparison`
კამპანიების შედარება.

```typescript
// Input
{
  campaignIds: string[];
}

// Output
{
  campaigns: {
    id: string;
    name: string;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    totalSent: number;
  }[];
}
```

---

## 4. Resources (Read-Only Data)

MCP Resources საშუალებას იძლევა წაიკითხოთ მონაცემები tool-ის გარეშე.

```typescript
// Available Resources
resources: [
  {
    uri: "email-campaign://contacts/all",
    name: "All Contacts",
    description: "List of all contacts",
    mimeType: "application/json"
  },
  {
    uri: "email-campaign://campaigns/active",
    name: "Active Campaigns",
    description: "Currently sending campaigns",
    mimeType: "application/json"
  },
  {
    uri: "email-campaign://domains/warmup",
    name: "Warmup Domains",
    description: "Domains in warmup phase",
    mimeType: "application/json"
  },
  {
    uri: "email-campaign://inbox/unread",
    name: "Unread Messages",
    description: "Unread inbox messages",
    mimeType: "application/json"
  },
  {
    uri: "email-campaign://analytics/today",
    name: "Today's Stats",
    description: "Today's email statistics",
    mimeType: "application/json"
  }
]
```

---

## 5. Authentication

### API Key Flow

```typescript
// src/auth.ts
export function validateApiKey(apiKey: string | undefined): boolean {
  const validKey = process.env.MCP_API_KEY;
  if (!validKey) {
    throw new Error("MCP_API_KEY not configured");
  }
  return apiKey === validKey;
}

// HTTP middleware
export function authMiddleware(req: Request): boolean {
  const apiKey = req.headers.get("X-API-Key")
    || req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!validateApiKey(apiKey)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Invalid or missing API key"
    );
  }
  return true;
}
```

### Environment Variables

```env
# .env
DATABASE_URL="postgresql://..."
MCP_API_KEY="your-secure-api-key-here"
MCP_HTTP_PORT=3001
```

---

## 6. Error Handling

### Error Types

```typescript
// src/utils/errors.ts
export enum McpErrorCode {
  // Standard MCP errors
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom errors
  NOT_FOUND = -32001,
  VALIDATION_ERROR = -32002,
  DUPLICATE_ERROR = -32003,
  PERMISSION_ERROR = -32004,
  DATABASE_ERROR = -32005,
}

export class ToolError extends Error {
  constructor(
    public code: McpErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}
```

### Error Response Format

```typescript
// Tool error response
{
  content: [{
    type: "text",
    text: JSON.stringify({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Email is required",
        field: "email"
      }
    })
  }],
  isError: true
}
```

---

## 7. Implementation Phases

### Phase 1: Core Setup (საფუძველი)
- [ ] პროექტის სტრუქტურის შექმნა
- [ ] package.json და tsconfig.json
- [ ] Prisma client integration
- [ ] MCP Server base setup
- [ ] stdio transport
- [ ] Basic error handling

### Phase 2: Contact Tools
- [ ] contacts_list
- [ ] contacts_get
- [ ] contacts_create
- [ ] contacts_update
- [ ] contacts_delete
- [ ] contacts_bulk_create

### Phase 3: Campaign Tools
- [ ] campaigns_list
- [ ] campaigns_get
- [ ] campaigns_create
- [ ] campaigns_update
- [ ] campaigns_delete
- [ ] campaigns_add_contacts
- [ ] campaigns_remove_contacts
- [ ] campaigns_prepare
- [ ] campaigns_start
- [ ] campaigns_pause

### Phase 4: Template Tools
- [ ] templates_list
- [ ] templates_create
- [ ] templates_update
- [ ] templates_delete

### Phase 5: Domain & Warmup Tools
- [ ] domains_list
- [ ] domains_get
- [ ] domains_add
- [ ] domains_update
- [ ] domains_delete
- [ ] domains_toggle_active
- [ ] warmup_start
- [ ] warmup_stop
- [ ] warmup_reset
- [ ] warmup_status
- [ ] warmup_overview

### Phase 6: Inbox Tools
- [ ] inbox_conversations
- [ ] inbox_messages
- [ ] inbox_reply
- [ ] inbox_mark_read
- [ ] inbox_mark_unread
- [ ] inbox_archive
- [ ] inbox_stats

### Phase 7: Analytics Tools
- [ ] analytics_overview
- [ ] campaigns_stats
- [ ] analytics_campaign_comparison

### Phase 8: HTTP Transport & Auth
- [ ] HTTP/SSE transport implementation
- [ ] API Key authentication
- [ ] Rate limiting (optional)

### Phase 9: Resources
- [ ] Resource handlers
- [ ] All defined resources

### Phase 10: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] README.md
- [ ] Usage examples

---

## 8. Configuration Files

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/email_campaign"

# MCP Server
MCP_API_KEY="generate-a-secure-key-here"
MCP_HTTP_PORT=3001

# Optional
LOG_LEVEL="info"
```

---

## 9. Usage Examples

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "email-campaign": {
      "command": "node",
      "args": ["/path/to/email-resend/mcp-server/dist/index.js", "--stdio"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### Claude Code Configuration

```json
// .claude/settings.local.json
{
  "mcpServers": {
    "email-campaign": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js", "--stdio"]
    }
  }
}
```

### HTTP Client Usage

```bash
# List contacts
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "contacts_list",
      "arguments": { "limit": 10 }
    }
  }'
```

---

## 10. Security Considerations

1. **API Key Security**
   - მინიმუმ 32 სიმბოლო
   - Environment variable-ში შენახვა
   - არასოდეს logs-ში ჩაწერა

2. **Database Access**
   - Read-only replica (optional) analytics-ისთვის
   - Connection pooling
   - Query timeout limits

3. **Input Validation**
   - Zod schemas ყველა input-ისთვის
   - SQL injection protection (Prisma handles)
   - Max limits for arrays and strings

4. **Rate Limiting (HTTP)**
   - Per-API-key limits
   - Bulk operations limits

---

## 11. Monitoring & Logging

```typescript
// Structured logging
const log = {
  info: (msg: string, data?: object) =>
    console.log(JSON.stringify({ level: "info", msg, ...data, ts: new Date() })),
  error: (msg: string, error?: Error, data?: object) =>
    console.error(JSON.stringify({ level: "error", msg, error: error?.message, ...data, ts: new Date() })),
};

// Tool call logging
log.info("Tool called", { tool: "contacts_list", args: { limit: 50 } });
```

---

## შემდეგი ნაბიჯი

გეგმა მზადაა! როდესაც მზად იქნებით დასაწყებად, დავიწყებთ **Phase 1: Core Setup**-ით.

კითხვები ან ცვლილებები?
