# MiniZapier Test Workflow Templates

Quick-start templates for testing all MiniZapier features.

## Available Templates

### 1. Full Test - All Features

Tests the complete workflow pipeline:
```
WEBHOOK → TRANSFORM → HTTP_REQUEST → CONDITION (IF/ELSE)
                                         ↓ true              ↓ false
                                    DATABASE_QUERY      TELEGRAM (fail)
                                         ↓
                                    SEND_EMAIL
                                         ↓
                                    TELEGRAM (success)
```

**Features tested:**
- ✅ Webhook Trigger
- ✅ Transform (JSONPath)
- ✅ HTTP Request
- ✅ Condition (IF/ELSE branching)
- ✅ Database Query
- ✅ Send Email
- ✅ Send Telegram

### 2. Email Trigger Test

Tests email receiving functionality:
```
EMAIL_TRIGGER → TELEGRAM
```

**Features tested:**
- ✅ Email Trigger (inbound emails)
- ✅ Send Telegram

---

## Quick Setup Guide

### Step 1: Create Credentials

In MiniZapier UI → Settings → Credentials, create:

| Type | Name | Required Data |
|------|------|---------------|
| **Telegram** | My Telegram Bot | Bot Token from @BotFather |
| **Resend** | Resend API | API Key from resend.com |
| **Database** | PostgreSQL | Connection string |

### Step 2: Get Your Telegram Chat ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your user ID (e.g., `8147889363`)

### Step 3: Create Workflow from Template

**Option A: Via UI**
1. Go to Workflows → Create New
2. Select template "Full Test - All Features"
3. Fill in placeholders

**Option B: Via API**
```bash
curl -X POST https://your-domain/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Full Test",
    "definition": { ... template definition ... }
  }'
```

### Step 4: Test

**For Webhook workflow:**
```bash
curl -X POST https://your-domain/api/webhooks/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Test!"}'
```

**For Email workflow:**
Send an email to your configured address (e.g., `test@yourdomain.xyz`)

---

## Expected Results

### Full Test Success:
1. ✅ HTTP request to httpbin.org returns 200
2. ✅ Condition evaluates to TRUE
3. ✅ Database query counts workflows
4. ✅ Email sent with results
5. ✅ Telegram notification received

### Email Trigger Success:
1. ✅ Email received by webhook
2. ✅ Email content parsed (from, subject, body)
3. ✅ Telegram notification with email content

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook 404 | Check webhook URL token |
| Email not received | Verify MX records in DNS |
| Telegram not sent | Check bot token and chat ID |
| Database error | Verify connection string |

---

## Template Files

- `full-test-workflow.json` - Complete feature test
- `email-trigger-workflow.json` - Email trigger test
- `index.ts` - TypeScript exports
