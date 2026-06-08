# BuyersBrief Railway Deployment Guide

**Project:** buyersbrief.com.au  
**Hosting:** Railway  
**Database:** Supabase PostgreSQL  
**DNS:** Cloudflare  
**Deployment source:** GitHub `main`

## Overview

BuyersBrief production is deployed on Railway from the GitHub repository. Railway builds the React frontend and Express/tRPC backend, then serves the compiled frontend through the backend process. Cloudflare DNS points `buyersbrief.com.au` to the Railway production service.

## Architecture

| Component | Service | Details |
|---|---|---|
| Frontend | React 19 + Vite | Compiled to `dist/public`. |
| Backend | Node.js + Express + tRPC | Started with `pnpm start`; API available at `/api/trpc`. |
| Database | Supabase PostgreSQL | Accessed through `DATABASE_URL`. |
| Hosting | Railway | Automatic deploys from GitHub `main`. |
| DNS | Cloudflare | Domain records point to Railway. |

## Required Railway Variables

The following variables must be configured in Railway. Values must be stored only in Railway, Supabase, or the relevant provider dashboard, never in repository files.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Session token signing secret. Use a long random value. |
| `OPENAI_API_KEY` | Yes | GPT-4o AI search and CMA provider key. |
| `OPENAI_SEARCH_MODEL` | Optional | GPT-4o search model override. Defaults to `gpt-4o`. |
| `LLM_TIMEOUT_MS` | Optional | LLM request timeout in milliseconds. Defaults to `60000`; search calls also enforce their own 45-second timeout. |
| `NODE_ENV` | Yes | Set to `production`. |
| `CLICKSEND_USERNAME` | Yes | ClickSend subaccount username used for partner registration notification emails. |
| `CLICKSEND_API_KEY` | Yes | ClickSend API key used with `CLICKSEND_USERNAME` for transactional email Basic Auth. |
| `CLICKSEND_FROM_EMAIL_ADDRESS_ID` | Recommended | Verified ClickSend from-address ID for partner notification emails. Also accepts `CLICKSEND_EMAIL_ADDRESS_ID` or `CLICKSEND_EMAIL_FROM_ID`. |
| `CLICKSEND_EMAIL_FROM_NAME` | Optional | Display name for partner notification emails. Defaults to `Buyers Brief`. |
| `CLICKSEND_EMAIL_FROM` | Optional | Verified sender email fallback if no ClickSend from-address ID is supplied. |
| `PARTNER_REGISTRATION_EMAIL_TO` | Optional | Notification recipient. Defaults to `rick@rickjohnson.com.au`. |
| `STRIPE_SECRET_KEY` | Future | Required only when paid billing is enabled. |
| `STRIPE_PUBLISHABLE_KEY` | Future | Required only when paid billing is enabled. |

## Deployment Workflow

Every push to GitHub `main` triggers a Railway deployment. Before pushing, run the local verification suite.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Then commit and push only the intended changes.

```bash
git status --short --branch
git add <changed-files>
git commit -m "Update ..."
git push
```

Railway normally installs dependencies, builds the project, starts the production server, and exposes the updated deployment within several minutes.

## Daily Search Scheduler

The property-search workflow is OpenAI-only. The standalone `POST /api/search` route and the dashboard preview/search mutations now call GPT-4o with web search from the server, so browser-side JavaScript rendering limitations in third-party analysis tools are avoided.

Configure a Railway cron service or scheduled job with the command below after the normal build step has completed.

```bash
pnpm scheduler
```

| Variable | Required | Purpose |
|---|---:|---|
| `SCHEDULER_BRIEF_LIMIT` | Optional | Maximum active briefs processed per run. Defaults to `500`. |
| `SCHEDULER_DELAY_MS` | Optional | Delay between brief searches to avoid provider rate spikes. Defaults to `3000`. |

The scheduler fetches active briefs, runs the same GPT-4o search logic, deduplicates matches by listing URL or address, inserts only newly discovered matches, and updates each brief's `lastRunAt` timestamp.

## DNS Configuration

Cloudflare should point the apex/root domain and any required `www` hostname to the Railway production target using Railway's recommended domain configuration. Keep proxy and TLS settings aligned with Railway and Cloudflare production guidance.

## Production Verification

After deployment, verify the public and authenticated flows relevant to the change.

| Check | Expected result |
|---|---|
| `https://buyersbrief.com.au` | Public site loads. |
| `https://buyersbrief.com.au/signup` | Signup and free-search preview flow loads. |
| `https://buyersbrief.com.au/login` | Login page loads and authenticates a valid user. |
| `https://buyersbrief.com.au/dashboard` | Unauthenticated users are redirected or shown a protected-state prompt; authenticated users see their persisted brief and match data. |
| Browser console | No unexpected runtime errors. |
| Railway logs | No startup, database, or API-key errors. |

## Rollback

If a deployment is unhealthy, use Railway's deployment rollback to return to the last known-good deployment or revert the Git commit and push the revert to `main`.

## Database Migrations

When schema changes are required, update `drizzle/schema.ts`, generate the migration, apply it through the approved Supabase production process, and verify the schema before deploying dependent application code.

```bash
pnpm db:push
```

Schema changes should be reviewed separately from UI-only deployments so production rollback remains straightforward.
