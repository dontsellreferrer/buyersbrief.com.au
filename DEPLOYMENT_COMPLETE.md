# Buyers Brief — Deployment Infrastructure Complete ✓

**Date:** May 28, 2026  
**Status:** Infrastructure Ready for Development  
**Domain:** buyersbrief.com.au  
**Hosting:** Railway (buyersbriefcomau-production.up.railway.app)

---

## What We've Accomplished

### ✓ Phase 1: Infrastructure Setup (COMPLETE)

| Task | Status | Details |
|------|--------|---------|
| **Supabase Database** | ✓ | PostgreSQL database created and connected |
| **GitHub Repository** | ✓ | Code pushed to dontsellreferrer/buyersbrief.com.au |
| **Railway Project** | ✓ | Deployment configured and live |
| **Cloudflare DNS** | ✓ | CNAME record pointing to Railway |
| **Environment Variables** | ✓ | DATABASE_URL and NODE_ENV configured |
| **OpenAI API Key** | ✓ | Validated and ready for CMA engine |
| **SSL Certificate** | ✓ | Auto-issued by Cloudflare |

---

## Infrastructure Details

### Database Connection
- **Provider:** Supabase (PostgreSQL)
- **Connection String:** `postgresql://postgres:P@ssw0rd01-rolandu20@db.xnfmqbqflcuvrsexphaq.supabase.co:5432/postgres`
- **Status:** Connected ✓

### Railway Deployment
- **Project:** buyersbrief.com.au
- **Service:** buyersbrief.com.au (production)
- **Public Domain:** buyersbriefcomau-production.up.railway.app
- **Custom Domain:** buyersbrief.com.au (via Cloudflare CNAME)
- **Status:** Online ✓
- **Auto-Deploy:** Enabled (pushes to GitHub main branch trigger deployments)

### DNS Configuration
- **Domain Registrar:** VentraIP
- **DNS Provider:** Cloudflare
- **Nameservers:** Configured ✓
- **CNAME Record:** @ → buyersbriefcomau-production.up.railway.app
- **Proxy Status:** Proxied (orange cloud)
- **TTL:** Auto
- **Propagation:** 5-30 minutes (usually complete)

### API Keys & Secrets
| Key | Status | Notes |
|-----|--------|-------|
| OPENAI_API_KEY | ✓ Valid | For CMA engine (GPT-4o) |
| ANTHROPIC_API_KEY | ⚠ Placeholder | For brief search (Claude) |
| STRIPE_PUBLISHABLE_KEY | ⚠ Placeholder | For frontend payment UI |
| STRIPE_SECRET_KEY | ⚠ Placeholder | For backend payment processing |
| RESEND_API_KEY | ⚠ Placeholder | For transactional emails |
| TWILIO_ACCOUNT_SID | ⚠ Placeholder | For SMS alerts |
| TWILIO_AUTH_TOKEN | ⚠ Placeholder | For SMS alerts |
| TWILIO_PHONE_NUMBER | ⚠ Placeholder | For SMS alerts |

**Note:** Placeholder keys are marked as TODO in the bug register. These must be replaced with real credentials before going live.

---

## Deployment Workflow

### How Deployments Work

1. **You push code to GitHub** (main branch)
2. **Railway detects the push** (webhook)
3. **Railway automatically:**
   - Pulls the latest code
   - Installs dependencies (`pnpm install`)
   - Builds the project (`pnpm build`)
   - Starts the server (`pnpm start`)
   - Deploys to production
4. **buyersbrief.com.au is updated** (usually 3-5 minutes)

### Manual Deployment

If you need to manually trigger a deployment:

1. Go to https://railway.app
2. Select the buyersbrief.com.au project
3. Click **"Deploy"** button
4. Select the commit to deploy
5. Click **"Deploy"**

### Rollback to Previous Version

If a deployment breaks:

1. Go to Railway project
2. Click **"Deployments"** tab
3. Find the previous working deployment
4. Click **"..."** menu
5. Select **"Rollback"**

---

## Testing the Deployment

### Current Status

✓ **Railway is responding:** HTTP 200 OK  
✓ **SSL certificate:** Valid (green lock)  
✓ **Database connection:** Configured  
✓ **Environment variables:** Set  

### What's Currently Deployed

The current deployment shows the **default Manus scaffold** — a blank React app with:
- Homepage shell at `/`
- tRPC API at `/api/trpc`
- Authentication system (Manus OAuth)
- Database connection (Supabase)

### Next Steps to Build

The following features need to be built:

1. **Homepage** — Hero section, brief basics card, how-it-works, pricing, footer
2. **Brief Intake Form** — 6-step AI form collecting property preferences
3. **Signup Flow** — Tier selection, Stripe payment, broker referral path
4. **Member Dashboard** — Daily match results, hotlist, CMA rendering
5. **Partner Portal** — Property submission and management
6. **Daily Cron Scheduler** — Automated matching and alerts
7. **Email/SMS Alerts** — Resend and Twilio integration

---

## Important Files & References

### Project Structure
```
/home/ubuntu/buyersbrief/
├── client/                 # React frontend
│   ├── src/pages/         # Page components
│   ├── src/components/    # Reusable UI components
│   └── src/lib/trpc.ts    # tRPC client
├── server/                # Node.js backend
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database queries
│   └── storage.ts         # S3 file storage
├── drizzle/               # Database schema
│   └── schema.ts          # Table definitions
├── RAILWAY_DEPLOYMENT_GUIDE.md   # Full deployment guide
├── DEPLOYMENT_COMPLETE.md        # This file
└── todo.md                       # Feature checklist
```

### Key Documentation
- **RAILWAY_DEPLOYMENT_GUIDE.md** — Complete deployment reference
- **todo.md** — Feature checklist and known issues
- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **Cloudflare Docs:** https://developers.cloudflare.com

---

## Monitoring & Logs

### View Deployment Logs

1. Go to https://railway.app
2. Select buyersbrief.com.au project
3. Click **"Deployments"** tab
4. Click on a deployment to view logs

### View Application Logs

1. Click **"Logs"** tab
2. See real-time application output
3. Useful for debugging errors

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Build fails** | Check logs for errors. Run `pnpm install && pnpm build` locally first. |
| **App crashes** | Check DATABASE_URL is correct. Check API keys are valid. |
| **Blank page** | Check browser console for errors. Verify frontend build succeeded. |
| **API errors** | Check API keys (OpenAI, Anthropic, Stripe) are valid. |
| **DNS not working** | Wait 5-30 minutes for propagation. Check Cloudflare CNAME record. |

---

## Cost Estimate

| Service | Free Tier | Paid Tier | Monthly Cost |
|---------|-----------|-----------|--------------|
| Railway | 5 GB RAM/month | Pay-as-you-go | $5-20 |
| Supabase | 500 MB DB | $25/month | $25+ |
| Cloudflare | Unlimited | Pro plan | $20+ |
| OpenAI | Pay-as-you-go | N/A | $10-50 |
| Stripe | 2.9% + $0.30 | N/A | Variable |
| Resend | 100 emails/day | $20/month | $20+ |
| Twilio | $0.0075/SMS | N/A | $5-20 |

**Estimated monthly cost:** $30-50 (development), $100-200 (production)

---

## Security Checklist

- [ ] Database password stored securely (not in code)
- [ ] API keys stored in Railway Variables (not in code)
- [ ] GitHub repository is private or has no sensitive data
- [ ] SSL certificate valid (Cloudflare auto-issued)
- [ ] Database backups enabled (Supabase automatic daily)
- [ ] Environment variables match production values
- [ ] No hardcoded secrets in code
- [ ] Rate limiting configured (if needed)
- [ ] CORS configured properly
- [ ] SQL injection protection (using Drizzle ORM)

---

## Backup & Recovery

### Database Backups

Supabase automatically backs up your database daily. To restore:

1. Go to Supabase dashboard
2. Go to **Settings → Backups**
3. Select a backup point
4. Click **"Restore"**

### Code Rollback

If code breaks production:

1. Go to Railway **Deployments** tab
2. Find the last working deployment
3. Click **"Rollback"**

---

## Before Going Live Checklist

- [ ] All features built and tested
- [ ] OpenAI API key is valid (not placeholder)
- [ ] Anthropic API key configured (Claude brief search)
- [ ] Stripe API keys configured (payment processing)
- [ ] Resend API key configured (email alerts)
- [ ] Twilio credentials configured (SMS alerts)
- [ ] Database schema migrated to Supabase
- [ ] Homepage loads correctly
- [ ] Brief intake form works end-to-end
- [ ] Signup flow completes with payment
- [ ] Dashboard displays daily matches
- [ ] CMA rendering matches prototype
- [ ] Email alerts send correctly
- [ ] SMS alerts send correctly
- [ ] Daily cron scheduler runs
- [ ] Error logs monitored
- [ ] SSL certificate valid (green lock)
- [ ] Domain resolves correctly
- [ ] Performance tested (load times)
- [ ] Mobile responsive tested
- [ ] Cross-browser tested

---

## Next Steps

### Immediate (Today)
1. ✓ Infrastructure complete
2. → Start building homepage
3. → Build brief intake form
4. → Build signup flow

### This Week
5. → Build member dashboard
6. → Build partner portal
7. → Set up daily cron scheduler

### Before Launch
8. → Replace placeholder API keys
9. → Full end-to-end testing
10. → Performance optimization
11. → Security audit
12. → Go live!

---

## Support & Resources

- **Railway Dashboard:** https://railway.app
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **GitHub Repository:** https://github.com/dontsellreferrer/buyersbrief.com.au
- **Deployment Guide:** See RAILWAY_DEPLOYMENT_GUIDE.md

---

## Questions?

Refer to:
1. RAILWAY_DEPLOYMENT_GUIDE.md for deployment questions
2. todo.md for feature status
3. Railway docs for platform questions
4. Supabase docs for database questions

---

**Infrastructure setup complete. Ready to start building features!**
