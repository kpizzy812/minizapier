# MiniZapier - Quick Testing Guide

This guide helps you quickly test all MiniZapier features.

## Prerequisites

- Telegram account
- 5 minutes of your time

---

## Quick Test (5 min)

### Step 1: Create Telegram Bot

1. Open Telegram, find **@BotFather**
2. Send `/newbot`
3. Follow instructions, get your **Bot Token** (looks like `123456789:ABCdefGHI...`)
4. Start a chat with your new bot (send any message)

### Step 2: Get Your Chat ID

1. Open Telegram, find **@userinfobot**
2. Send any message
3. Copy your **User ID** (looks like `8147889363`)

### Step 3: Login to MiniZapier

1. Go to https://minizapier.syntratrade.xyz
2. Register/Login with email

### Step 4: Create Telegram Credential

1. Go to **Settings** → **Credentials**
2. Click **Add Credential**
3. Select type: **Telegram**
4. Name: `My Telegram Bot`
5. Paste your Bot Token
6. Save

### Step 5: Create Test Workflow

1. Go to **Workflows** → **Create New**
2. Select template: **Quick Test (Telegram Only)**
3. Fill in:
   - `TELEGRAM_CHAT_ID`: Your chat ID from Step 2
   - `CREDENTIAL_TELEGRAM`: Select your Telegram credential
4. Save and **Activate** the workflow

### Step 6: Test!

Copy the webhook URL from the workflow and run:

```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello MiniZapier!", "test": true}'
```

**Expected result:** Telegram message with test results!

---

## What Gets Tested

| Component | Description |
|-----------|-------------|
| **Webhook Trigger** | Receives HTTP POST requests |
| **Transform** | Extracts/transforms data using JSONPath |
| **HTTP Request** | Makes external API calls |
| **Condition** | IF/ELSE branching logic |
| **Send Telegram** | Sends messages via Telegram Bot API |

---

## Full Test (All Features)

To test ALL features including Email and Database:

### Additional Setup:

1. **Resend Credential** (for email):
   - Get API key from https://resend.com
   - Create credential type: Resend

2. **Database Credential** (for SQL queries):
   - Connection string: `postgresql://user:pass@host:5432/db`
   - Create credential type: Database

3. Use template: **Full Test - All Features**

---

## Email Trigger Test

To test inbound email trigger:

1. Set up MX records for your domain (see Resend docs)
2. Create workflow from template: **Email Trigger Test**
3. Send email to configured address
4. Receive Telegram notification with email content

---

## API Documentation

Swagger docs: https://minizapier.syntratrade.xyz/api/docs

### Key Endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/webhooks/:token` | Trigger workflow via webhook |
| `GET /api/templates` | List available templates |
| `POST /api/templates/:id/create` | Create workflow from template |
| `GET /api/workflows` | List user workflows |
| `POST /api/workflows/:id/test` | Run test execution |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Telegram not received | Check bot token, verify you messaged the bot first |
| Webhook 404 | Check webhook URL, workflow must be active |
| Credential error | Verify credential exists and is correct type |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  - React Flow workflow editor                               │
│  - Credentials management                                    │
│  - Execution history                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend (NestJS)                      │
│  - REST API                                                  │
│  - Webhook handlers                                          │
│  - Workflow processor                                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         PostgreSQL        Redis          BullMQ
         (data)           (cache)        (queue)
```

**Triggers:** Webhook, Schedule (cron), Email
**Actions:** HTTP Request, Send Email, Send Telegram, Database Query, Transform
**Logic:** Condition (IF/ELSE branching)
