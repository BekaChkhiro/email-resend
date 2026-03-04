# Email Campaign App — სპეციფიკაცია

## ტექნოლოგიური სტეკი
- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **Email Provider:** Resend API
- **Auth:** მარტივი password-based authentication

---

## ძირითადი კონცეფცია

აპლიკაცია რომელიც მართავს email კამპანიებს. 5 verified დომენი Resend-ზე გამოიყენება მეილების გასაგზავნად. კონტაქტები (30+) ნაწილდება დომენებზე round-robin პრინციპით, რომ ერთი დომენიდან არ გაიგზავნოს ყველა მეილი.

---

## ფუნქციონალი

### 1. კონტაქტების მართვა
- **CSV იმპორტი** — CSV ფაილის ატვირთვა (სახელი, email, კომპანია)
- **ხელით დამატება** — ფორმით ერთ-ერთად კონტაქტის დამატება
- **კონტაქტების სია** — ყველა კონტაქტის ნახვა, რედაქტირება, წაშლა
- **Unsubscribe სტატუსი** — unsubscribe-გაკეთებული კონტაქტები აღარ მიიღებენ მეილს

### 2. დომენების მართვა
- **5 დომენი** — Resend-ზე verified დომენები
- **თითოეულ დომენს სხვადასხვა from name** — მაგ: domain1 = "John", domain2 = "Sarah"
- **from_email** — თითოეულ დომენზე მისამართი (მაგ: hello@domain1.com)
- **კონფიგურაცია UI-დან** — დომენის სახელის და from name-ის შეცვლა

### 3. კამპანიის შექმნა
- **Subject line** — მეილის სათაური
- **Email ფორმატი** — HTML ან Plain text (კამპანიაზე აირჩევ)
- **რამდენიმე template ვერსია** — მინიმუმ 2-3 ვერსია ერთი კამპანიისთვის
  - სისტემა როტაციით იყენებს ვერსიებს
  - მაგ: ვერსია 1 = "Hello {{firstName}}...", ვერსია 2 = "Hi {{firstName}}..."
  - თითოეული მიმღები განსხვავებულ ვერსიას მიიღებს
- **პერსონალიზაცია (Template Variables):**
  - `{{firstName}}` — კონტაქტის სახელი
  - `{{companyName}}` — კომპანიის სახელი
  - `{{email}}` — კონტაქტის email
- **Delay კონფიგურაცია** — კამპანიის შექმნისას აყენებ delay-ს მეილებს შორის (წამებში)

### 4. დომენების როტაცია (Round-Robin)
- 30 კონტაქტი / 5 დომენი = 6 მეილი თითო დომენიდან
- კონტაქტი #1 → domain1, #2 → domain2, ..., #6 → domain1, ...
- ასე არცერთი დომენი არ იტვირთება ზედმეტად

### 5. Template ვერსიების როტაცია
- კამპანიას აქვს რამდენიმე template ვერსია (ხელით დაწერილი)
- სისტემა როტაციით ანაწილებს ვერსიებს კონტაქტებზე
- მაგ: 3 ვერსია, 30 კონტაქტი = თითო ვერსია ~10 კონტაქტს ეგზავნება
- ეს ამცირებს spam ფილტრების რისკს

### 6. Tracking
- **Open tracking** — ვინ გახსნა მეილი (tracking pixel)
- **Click tracking** — ვინ დააკლიკა ლინკზე
- **Unsubscribe link** — ყოველ მეილში unsubscribe ლინკი
- Resend-ის webhook-ებით ან built-in tracking-ით

### 7. Campaign Analytics Dashboard
- **გაგზავნილი** — რამდენი მეილი გაიგზავნა
- **გახსნილი (Open rate)** — რამდენმა გახსნა
- **დაკლიკებული (Click rate)** — რამდენმა დააკლიკა
- **Bounce** — რამდენი ვერ ჩაბარდა
- **Unsubscribed** — რამდენმა გააკეთა unsubscribe
- თითოეული მეილის დეტალური სტატუსი

---

## მონაცემთა ბაზის სტრუქტურა

### ცხრილი: `domains`
| სვეტი | ტიპი | აღწერა |
|-------|------|--------|
| id | UUID | Primary key |
| domain | VARCHAR | დომენის სახელი (მაგ: example.com) |
| from_name | VARCHAR | გამგზავნის სახელი (მაგ: "John Smith") |
| from_email | VARCHAR | გამგზავნის მისამართი (მაგ: hello@example.com) |
| is_active | BOOLEAN | აქტიურია თუ არა |
| created_at | TIMESTAMP | შექმნის თარიღი |

### ცხრილი: `contacts`
| სვეტი | ტიპი | აღწერა |
|-------|------|--------|
| id | UUID | Primary key |
| email | VARCHAR | კონტაქტის email (unique) |
| first_name | VARCHAR | სახელი |
| last_name | VARCHAR | გვარი |
| company_name | VARCHAR | კომპანიის სახელი |
| is_unsubscribed | BOOLEAN | unsubscribe სტატუსი |
| created_at | TIMESTAMP | შექმნის თარიღი |

### ცხრილი: `campaigns`
| სვეტი | ტიპი | აღწერა |
|-------|------|--------|
| id | UUID | Primary key |
| name | VARCHAR | კამპანიის სახელი |
| subject | VARCHAR | Email subject line |
| email_format | ENUM | 'html' ან 'plain_text' |
| delay_seconds | INTEGER | მეილებს შორის delay (წამებში) |
| status | ENUM | 'draft', 'sending', 'completed', 'paused' |
| created_at | TIMESTAMP | შექმნის თარიღი |
| sent_at | TIMESTAMP | გაშვების თარიღი |

### ცხრილი: `campaign_templates`
| სვეტი | ტიპი | აღწერა |
|-------|------|--------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| version_name | VARCHAR | ვერსიის სახელი (მაგ: "Version A") |
| body | TEXT | მეილის ტექსტი (HTML ან plain text) |
| sort_order | INTEGER | როტაციის რიგი |

### ცხრილი: `campaign_emails`
| სვეტი | ტიპი | აღწერა |
|-------|------|--------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| contact_id | UUID | FK → contacts |
| domain_id | UUID | FK → domains |
| template_id | UUID | FK → campaign_templates |
| resend_id | VARCHAR | Resend API-ს response ID |
| status | ENUM | 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed' |
| opened_at | TIMESTAMP | გახსნის დრო |
| clicked_at | TIMESTAMP | კლიკის დრო |
| sent_at | TIMESTAMP | გაგზავნის დრო |
| error_message | TEXT | შეცდომის ტექსტი (თუ ვერ გაიგზავნა) |

---

## UI გვერდები

1. **Login** — პაროლის შეყვანა
2. **Dashboard** — კამპანიების სია + ზოგადი სტატისტიკა
3. **Contacts** — კონტაქტების სია, CSV იმპორტი, ხელით დამატება
4. **Domains** — 5 დომენის კონფიგურაცია (from name, from email)
5. **Campaign Create** — კამპანიის შექმნა (subject, templates, delay)
6. **Campaign Detail** — კამპანიის დეტალები + analytics (open/click rates)

---

## გაგზავნის ლოგიკა (Sending Flow)

1. მომხმარებელი ქმნის კამპანიას (subject, templates, delay)
2. ირჩევს კონტაქტებს (ყველა ან ფილტრით)
3. სისტემა ანაწილებს კონტაქტებს:
   - **დომენები** — round-robin (კონტაქტი 1→domain1, 2→domain2, ...)
   - **Templates** — round-robin (კონტაქტი 1→version A, 2→version B, ...)
4. სისტემა აგზავნის მეილებს delay-ით:
   - თითოეული მეილის შემდეგ ელოდება კონფიგურირებულ delay-ს
   - ჩანაცვლდება {{firstName}}, {{companyName}}, {{email}}
   - Resend API-ით იგზავნება შესაბამისი დომენის from მისამართიდან
5. ინახება campaign_emails ცხრილში ყველა დეტალი
6. Tracking/Webhook-ით განახლდება open/click სტატუსები
