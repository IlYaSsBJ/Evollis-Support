# Evollis Customer Support Agent

A working first-line customer support web application for Evollis, specifically designed for their Device-as-a-Service (DaaS) and circular economy platform. Powered by the Google Gemini API.


## What It Does

- Accepts free-text customer messages in English or French.
- Classifies each request into one of **4 categories**: Billing, Technical, Order, or General.
- Routes the request to a specialized response strategy per category based on real Evollis leasing policies (e.g., hardware insurance limits, 14-day contract withdrawals).
- Escalates to a human agent when the issue requires it (e.g., immediate manual contract termination, unresolved technical faults).
- Displays category badges, confidence levels, and contextual quick-action suggestions.
- Maintains full conversation history in the local browser state for multi-turn support sessions.

## What I would do next with 3 more days :

- If I had three more days, my immediate priority would be moving the application from a mock frontend simulation to a production-ready full-stack architecture. First, I would move the Gemini API call server-side (using Next.js API routes or an Express server) so the API key is never exposed in the browser, adding proper rate limiting per session to prevent abuse. Second, I would replace the ephemeral React state with a real database (like Supabase or PostgreSQL) to persist chat histories; currently, if a user refreshes the page, the entire conversation is lost, and storing this data would allow human agents to pick up exactly where the AI left off. Third, I would implement a functional escalation pipeline: when the AI flags an escalation, the backend would use a service like SendGrid to instantly email the support team with the transcript and the escalation reason, or automatically generate a ticket in a CRM like Zendesk. Finally, I would connect the agent to a mock read-only database to verify 8-digit Contract IDs or real-time shipping statuses, allowing the agent to self-resolve Order and Billing inquiries rather than simply deferring them to human agents.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite | Fast, lightweight, and requires no complex build configuration. |
| AI Engine| Gemini 2.5 Flash | Fast inference, natively supports strict Structured Outputs (JSON Schema) to guarantee app stability. |
| Deploy | Vercel | One-command deployment, zero config, and native SPA routing support via `vercel.json`. |
| Auth | Client-side API key | Simple for a 24-hour prototype; user securely inputs their own key locally. |

## How It Classifies Requests

The system uses Gemini's **Structured Outputs** (`responseSchema`) to guarantee a strict JSON response at the engine layer, completely eliminating markdown parsing crashes. The schema strictly requires:
- `category`: BILLING / TECHNICAL / ORDER / GENERAL
- `confidence`: high / medium / low
- `response`: the natural-language reply text
- `escalate`: boolean (`true`/`false`) — whether a human agent should follow up
- `escalation_reason`: string detailing why the escalation was triggered
- `quick_actions`: array of 2–3 suggested follow-up buttons

Each category triggers different contextual AI behavior:
- **BILLING** → Precise policy references (e.g., direct debits on the 5th), invoice location, escalates on manual terminations or payment incidents.
- **TECHNICAL** → Step-by-step troubleshooting, insurance limitations (max 2 interventions/year), requests IMEI/Serial Number, escalates if L2 hardware support is needed.
- **ORDER** → Hardware return logistics (e.g., wiping data and removing SIMs), always escalates for live carrier tracking.
- **GENERAL** → Warm, informative, explains the financial and environmental benefits of the circular economy, no escalation unless explicitly requested.

## Run Locally

git clone [https://github.com/IlYaSsBJ/Evollis-Support](https://github.com/IlYaSsBJ/Evollis-Support)
cd evollis-support
npm install
npm run dev
Then open http://localhost:5173, enter your Google Gemini API key into the secure prompt, and start chatting.

## What I would do next with 3 more days :

- If I had three more days, my immediate priority would be moving the application from a mock frontend simulation to a production-ready full-stack architecture. First, I would move the Gemini API call server-side (using Next.js API routes or an Express server) so the API key is never exposed in the browser, adding proper rate limiting per session to prevent abuse. Second, I would replace the ephemeral React state with a real database (like Supabase or PostgreSQL) to persist chat histories; currently, if a user refreshes the page, the entire conversation is lost, and storing this data would allow human agents to pick up exactly where the AI left off. Third, I would implement a functional escalation pipeline: when the AI flags an escalation, the backend would use a service like SendGrid to instantly email the support team with the transcript and the escalation reason, or automatically generate a ticket in a CRM like Zendesk. Finally, I would connect the agent to a mock read-only database to verify 8-digit Contract IDs or real-time shipping statuses, allowing the agent to self-resolve Order and Billing inquiries rather than simply deferring them to human agents.
