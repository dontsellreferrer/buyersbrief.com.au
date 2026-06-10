# BuyersBrief Railway Variables and Scheduler Guide

**Project:** buyersbrief.com.au  
**Prepared by:** Manus AI  
**Date:** 2026-06-10 GMT+10

## Current Railway Status

The production Railway service shown by the user is connected to the GitHub repository `dontsellreferrer/buyersbrief.com.au`, uses the `main` branch for production, and has automatic deploys enabled when changes are pushed to GitHub. This matches the required production model: GitHub-controlled Railway deployment, with no Manus-hosted runtime dependency.

The Railway variables screenshot shows that the main web service already has the core production variables required for the current OpenAI-based application. It also shows two deprecated AI-provider variables that are no longer used by this project and should be removed from Railway after the repository cleanup has been deployed and verified.

| Area | Status | Evidence / Required Action |
|---|---|---|
| GitHub source | Present | Railway service is connected to `dontsellreferrer/buyersbrief.com.au`. |
| Production branch | Present | Production branch is `main`. |
| Auto deploy | Present | Railway auto-deploys when pushed to GitHub. |
| Database | Present | `DATABASE_URL` is present. `POSTGRES_URL` is also present, but current server code uses `DATABASE_URL`. |
| Auth/session secret | Present | `JWT_SECRET` is present. |
| OpenAI | Present | `OPENAI_API_KEY` is present. |
| Runtime mode | Present | `NODE_ENV` is present and should be set to `production`. |
| ClickSend base credentials | Present | `CLICKSEND_USERNAME` and `CLICKSEND_API_KEY` are present. |
| ClickSend sender | Needs name alignment | Railway has `CLICKSEND_FROM`; current code expects `CLICKSEND_EMAIL_FROM`, `CLICKSEND_FROM_EMAIL`, or a sender ID variable such as `CLICKSEND_FROM_EMAIL_ADDRESS_ID`. |
| Deprecated AI-provider variables | Should remove | Two variables from the previous AI provider are present but no longer used by the current OpenAI-only application. |
| Deprecated email-provider variables | Probably unused | Two variables from the previous email provider are present; current server code does not reference them, and user-facing copy has been updated to ClickSend. |
| Scheduler / cron | Missing | User confirmed no separate scheduler or cron service exists in Railway. |

## What the Scheduler Is

The scheduler is a separate Railway service that runs the project’s existing daily search script. It is not the public website. The public website stays online continuously using `pnpm start`, while the scheduler should wake up on a timed schedule, run `pnpm scheduler`, process active buyer briefs, save new matches, and then exit.

Railway’s cron feature starts a service based on a crontab expression. Railway expects cron services to execute a task and terminate once finished, leaving no open resources.[1] Railway schedules use UTC, so Sydney time must be converted to UTC when choosing the cron expression.[1]

> Railway documentation: “Services configured as cron jobs are expected to execute a task, and terminate as soon as that task is finished, leaving no open resources.”[1]

## Recommended Scheduler Setup

Create a second Railway service in the same project, using the same GitHub repository and branch as the main web service. This second service should not expose the public domain. Its only purpose is to run the scheduler command on a daily cron schedule.

| Setting | Recommended value |
|---|---|
| Service name | `buyersbrief-daily-search` |
| Source repository | `dontsellreferrer/buyersbrief.com.au` |
| Branch | `main` |
| Build command | Same as main service, or Railway default if it already runs `pnpm build` correctly |
| Start command | `pnpm scheduler` |
| Cron schedule | Choose after confirming desired Sydney run time |
| Public domain | None required |
| Variables | Same database and OpenAI variables as the main service, plus optional scheduler throttling variables |

## Scheduler Variables

The scheduler needs access to the same production database and OpenAI key as the main website because it reads active briefs, runs OpenAI-backed search, and writes newly discovered matches.

| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_URL` | Yes | Same production Supabase PostgreSQL URL used by the main service. |
| `JWT_SECRET` | Recommended | Not directly required for search processing, but safe to keep shared with app runtime if copied wholesale. |
| `OPENAI_API_KEY` | Yes | Required for GPT-4o property search. |
| `OPENAI_SEARCH_MODEL` | Optional | Defaults to `gpt-4o`. |
| `LLM_TIMEOUT_MS` | Optional | Defaults to the project’s built-in timeout behavior. |
| `NODE_ENV` | Yes | Set to `production`. |
| `SCHEDULER_BRIEF_LIMIT` | Optional | Defaults to `500`; use a smaller number initially, such as `25`, if you want a cautious first run. |
| `SCHEDULER_DELAY_MS` | Optional | Defaults to `3000`; this waits three seconds between briefs to avoid provider spikes. |

ClickSend variables are not required for the current scheduler script unless scheduler-triggered match notifications are added later. The current scheduler creates matches and updates `lastRunAt`; it does not send email or SMS.

## Sydney-Time Cron Examples

Railway cron schedules are UTC-based.[1] Sydney is UTC+10 during AEST and UTC+11 during AEDT. Because the current date is June 2026, Sydney is on AEST, so 7:00 AM Sydney is 9:00 PM UTC on the previous calendar day. Railway does not apply Australia/Sydney daylight-saving conversion automatically; the UTC cron expression must be adjusted manually if exact local time matters across summer.

| Desired Sydney run time | AEST UTC cron | AEDT UTC cron | Notes |
|---|---|---|---|
| 6:00 AM Sydney | `0 20 * * *` | `0 19 * * *` | Runs the previous UTC evening. |
| 7:00 AM Sydney | `0 21 * * *` | `0 20 * * *` | Recommended default if buyers check results in the morning. |
| 8:00 AM Sydney | `0 22 * * *` | `0 21 * * *` | Later morning option. |
| 9:00 AM Sydney | `0 23 * * *` | `0 22 * * *` | Suitable if you want business-hours monitoring. |

My recommendation is to start with **7:00 AM Sydney daily**, using `0 21 * * *` while Sydney is on AEST. Revisit the cron expression before daylight saving starts if the exact local time matters.

## Step-by-Step Railway UI Guidance

In Railway, create the scheduler as a separate service rather than changing the current `buyersbrief.com.au` web service. This avoids accidentally replacing the live website process.

| Step | Action |
|---|---|
| 1 | In the Railway project canvas, select **New** or **Add Service**. |
| 2 | Choose **GitHub Repo** and select `dontsellreferrer/buyersbrief.com.au`. |
| 3 | Name the new service `buyersbrief-daily-search`. |
| 4 | Set the connected branch to `main`. |
| 5 | In the new service settings, set the start command to `pnpm scheduler`. |
| 6 | In the new service variables, add or share `DATABASE_URL`, `OPENAI_API_KEY`, and `NODE_ENV=production`. Optionally add `OPENAI_SEARCH_MODEL`, `LLM_TIMEOUT_MS`, `SCHEDULER_BRIEF_LIMIT`, and `SCHEDULER_DELAY_MS`. |
| 7 | In the new service settings, locate **Cron Schedule** and enter the chosen UTC cron expression, for example `0 21 * * *` for 7:00 AM Sydney during AEST. |
| 8 | Deploy the scheduler service. Confirm logs show the scheduler starts, processes briefs, prints `buyersbrief_daily_search_complete`, and exits. |

## Important Guardrails

Do not add a cron schedule to the current public website service unless Railway supports overriding the command for a separate execution context. The public service must continue running `pnpm start`; if its command is changed to `pnpm scheduler`, the public website could stop serving traffic.

Do not remove `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, or `NODE_ENV` from the main web service. The deprecated provider variables shown in Railway should be removed only after the cleanup deployment is verified and the live site remains healthy.

## References

[1]: https://docs.railway.com/cron-jobs "Railway Docs — Cron Jobs"
