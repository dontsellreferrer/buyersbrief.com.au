# BuyersBrief Railway Variables and Two-Stage Scheduler Guide

**Project:** buyersbrief.com.au  
**Prepared by:** Manus AI  
**Date:** 2026-06-10 GMT+10

## Current Railway Status

The production Railway service shown by the user is connected to the GitHub repository `dontsellreferrer/buyersbrief.com.au`, uses the `main` branch for production, and has automatic deploys enabled when changes are pushed to GitHub. This matches the required production model: GitHub-controlled Railway deployment, with no Manus-hosted runtime dependency.

The Railway variables screenshot shows that the main web service already has the core production variables required for the current OpenAI-based application. The separate Railway scheduler services have not yet been created, so the production system currently serves the website but does not yet have scheduled daily matching or scheduled morning notification dispatch.

| Area | Status | Evidence / Required Action |
|---|---|---|
| GitHub source | Present | Railway service is connected to `dontsellreferrer/buyersbrief.com.au`. |
| Production branch | Present | Production branch is `main`. |
| Auto deploy | Present | Railway auto-deploys when pushed to GitHub. |
| Database | Present | `DATABASE_URL` is present. `POSTGRES_URL` is also present, but current server code uses `DATABASE_URL` unless `POSTGRES_URL` is supplied. |
| Auth/session secret | Present | `JWT_SECRET` is present. |
| OpenAI | Present | `OPENAI_API_KEY` is present. |
| Runtime mode | Present | `NODE_ENV` is present and should be set to `production`. |
| ClickSend base credentials | Present | `CLICKSEND_USERNAME` and `CLICKSEND_API_KEY` are present. |
| ClickSend sender | Needs name alignment | Railway has `CLICKSEND_FROM`; current notification code can use `CLICKSEND_FROM`, but a verified sender ID variable such as `CLICKSEND_FROM_EMAIL_ADDRESS_ID` is still preferred for email reliability. |
| Scheduler / cron | Missing | User confirmed no separate scheduler or cron service exists in Railway. |

## Recommended Two-Stage Scheduler Design

The scheduler should be split into two Railway cron services. The first service performs the expensive OpenAI-backed matching before business hours. The second service sends user-facing ClickSend notifications at a normal morning delivery time.

| Stage | Railway service name | Command | Sydney time | AEST UTC cron | AEDT UTC cron | Purpose |
|---|---|---|---:|---|---|---|
| Matching | `buyersbrief-daily-match` | `pnpm scheduler:match` | 3:00 AM | `0 17 * * *` | `0 16 * * *` | Runs daily property matching and stores new matches. |
| Notifications | `buyersbrief-daily-notify` | `pnpm scheduler:notify` | 8:00 AM | `0 22 * * *` | `0 21 * * *` | Sends ClickSend email/SMS alerts for unnotified new matches. |

Railway cron schedules are UTC-based, so Sydney time must be converted to UTC when setting the cron expression.[1] Because Sydney is on AEST in June, 3:00 AM Sydney is 5:00 PM UTC on the previous UTC day, and 8:00 AM Sydney is 10:00 PM UTC on the previous UTC day. When daylight saving begins, update the cron expressions if exact local delivery time matters.

> Railway documentation states that cron services are expected to execute a task and terminate after the task completes, leaving no open resources.[1]

## Package Commands Added

The repository now exposes explicit commands for the two Railway services. `pnpm scheduler` remains as a backwards-compatible alias for the matching stage, but the explicit commands are preferred for production.

| Command | Use |
|---|---|
| `pnpm scheduler:match` | Production 3:00 AM matching job. |
| `pnpm scheduler:notify` | Production 8:00 AM notification dispatch job. |
| `pnpm scheduler:all` | Manual combined run only; not recommended as the normal production cron because it would send notifications immediately after matching. |
| `pnpm scheduler` | Backwards-compatible alias for `pnpm scheduler:match`. |

## Variables for Each Railway Service

Both scheduled services should be separate from the public website service. Do not change the current website service command from `pnpm start`.

| Variable | Web service | Match service | Notify service | Notes |
|---|---:|---:|---:|---|
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Yes | Yes | Must point to the same production database. |
| `JWT_SECRET` | Yes | Optional | Optional | Required by the web service; harmless to share with scheduler services. |
| `OPENAI_API_KEY` | Yes | Yes | No | Required only for the matching service and search API. |
| `OPENAI_SEARCH_MODEL` | Optional | Optional | No | Defaults to the project search model if unset. |
| `LLM_TIMEOUT_MS` | Optional | Optional | No | Optional OpenAI timeout tuning. |
| `NODE_ENV` | Yes | Yes | Yes | Set to `production`. |
| `SCHEDULER_BRIEF_LIMIT` | No | Optional | No | Defaults to `500`; set lower for cautious first runs. |
| `SCHEDULER_DELAY_MS` | No | Optional | No | Defaults to `3000`, creating a pause between briefs. |
| `SCHEDULER_NOTIFY_LIMIT` | No | No | Optional | Defaults to `1000` unnotified match rows per run. |
| `CLICKSEND_USERNAME` | Yes if partner form is live | No | Yes | Required for notification dispatch. |
| `CLICKSEND_API_KEY` | Yes if partner form is live | No | Yes | Required for notification dispatch. |
| `CLICKSEND_FROM` | Useful | No | Useful | Current Railway variable can be used as fallback sender. |
| `CLICKSEND_FROM_EMAIL_ADDRESS_ID` | Preferred | No | Preferred | Use a verified ClickSend email sender ID where available. |
| `CLICKSEND_SMS_FROM` | Optional | No | Optional | Defaults to `BuyersBrief` if unset. |

## Notification Behaviour

The notification service sends email by default when a user has new unnotified matches unless the user has explicitly disabled daily email in their notification preferences. SMS is stricter: it is sent only when the user has enabled hot SMS notifications, has SMS consent recorded, and has a mobile number on file.

After a notification is successfully sent through at least one enabled channel, the related matches are marked with `notified_at` so they are not sent repeatedly the next day. If ClickSend rejects a send request, those matches are not marked as notified, which allows a later retry after the configuration issue is fixed.

| Channel | When it sends | Safety condition |
|---|---|---|
| Email | New unnotified matches and `dailyEmail` is not disabled | Requires user email and ClickSend email configuration. |
| SMS | New unnotified matches and `hotSms=true` | Requires SMS consent, mobile number, and ClickSend SMS configuration. |

## Step-by-Step Railway UI Guidance

Create two new Railway services in the same project. They should use the same GitHub repository and branch as the main website, but they should not have public domains.

| Step | Matching service: `buyersbrief-daily-match` |
|---|---|
| 1 | In the Railway project canvas, choose **New** or **Add Service**. |
| 2 | Choose **GitHub Repo** and select `dontsellreferrer/buyersbrief.com.au`. |
| 3 | Name the service `buyersbrief-daily-match`. |
| 4 | Set the connected branch to `main`. |
| 5 | Set the start command to `pnpm scheduler:match`. |
| 6 | Add/share `DATABASE_URL`, `OPENAI_API_KEY`, and `NODE_ENV=production`. Optionally add `OPENAI_SEARCH_MODEL`, `LLM_TIMEOUT_MS`, `SCHEDULER_BRIEF_LIMIT`, and `SCHEDULER_DELAY_MS`. |
| 7 | Set the cron schedule to `0 17 * * *` while Sydney is on AEST for a 3:00 AM Sydney run. |
| 8 | Deploy the service and confirm logs show `buyersbrief_daily_match_complete`, then the process exits. |

| Step | Notification service: `buyersbrief-daily-notify` |
|---|---|
| 1 | In the same Railway project canvas, choose **New** or **Add Service** again. |
| 2 | Choose **GitHub Repo** and select `dontsellreferrer/buyersbrief.com.au`. |
| 3 | Name the service `buyersbrief-daily-notify`. |
| 4 | Set the connected branch to `main`. |
| 5 | Set the start command to `pnpm scheduler:notify`. |
| 6 | Add/share `DATABASE_URL`, `NODE_ENV=production`, `CLICKSEND_USERNAME`, and `CLICKSEND_API_KEY`. Add `CLICKSEND_FROM_EMAIL_ADDRESS_ID` if available, and optionally `CLICKSEND_SMS_FROM`. |
| 7 | Set the cron schedule to `0 22 * * *` while Sydney is on AEST for an 8:00 AM Sydney run. |
| 8 | Deploy the service and confirm logs show `buyersbrief_daily_notify_complete`, then the process exits. |

## Important Guardrails

Do not add either cron schedule to the current public website service if doing so requires replacing its start command. The public service must continue running `pnpm start`; if its command is changed to a scheduler command, the public website could stop serving traffic.

Do not use `pnpm scheduler:all` for normal production scheduling. It exists for emergency/manual verification only. Running it as a daily cron would defeat the purpose of separating early matching from 8:00 AM user-facing notification dispatch.

Do not remove `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, or `NODE_ENV` from the main web service. If old unused provider variables remain visible in Railway, remove them only after the cleanup deployment is verified and the live site remains healthy.

## References

[1]: https://docs.railway.com/cron-jobs "Railway Docs — Cron Jobs"
