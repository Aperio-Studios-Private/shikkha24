# Manual deploy — with no GitHub Actions available

> **Why this document exists.** The repository's own budget guard (agent rule 7) rules out
> paid GitHub Actions minutes, so when the included Actions allowance is used up, **every
> workflow stops** — including `deploy-cloudflare.yml`, which is the normal way this site
> ships. That is a real operational dead-end, not a hypothetical one: it happened on
> 2026-10-16 with ~20 verified fixes waiting in git.
>
> The site can still be deployed **entirely by hand, with zero GitHub involvement.** This
> is that procedure, written down because the workaround is non-obvious and one step of it
> fails in a way that looks like an authentication problem on your account.

## When to use this

- The Actions budget is exhausted and workflows refuse to start.
- You want to ship one specific thing now without waiting on CI.
- GitHub itself is unavailable.

## Step 1 — Build the frontend (on your Mac)

```bash
cd /Volumes/SSD/CODES/NewsPortal

CMS_URL=https://cms.shikkha24.com \
PUBLIC_MEDIA_BASE_URL=https://cms.shikkha24.com \
PUBLIC_CMS_ORIGIN=https://cms.shikkha24.com \
pnpm run build:frontend
```

⚠️ **The three `CMS_*` variables are not optional, and omitting them fails silently.**
Without `CMS_URL` Astro cannot reach the CMS during the build and emits a **degraded
52-page site instead of 89** — the real articles, their covers and the CMS-driven listings
all vanish, and **nothing errors or warns**. A build that "succeeds" is not proof the
build is right; check the page count:

```bash
grep -o '[0-9]* page(s) built'   # must say 89
```

`PUBLIC_MEDIA_BASE_URL` is needed for image URLs to resolve, and `PUBLIC_CMS_ORIGIN` for
the interactive islands (live blog, polls).

## Step 2 — Deploy to Cloudflare

```bash
cd frontend
CLOUDFLARE_ACCOUNT_ID=0e2e4a6986f91edabe1dae4945a9b88b npx wrangler deploy
```

⚠️ **The account ID is required. Do not omit it — see the next section for why.**

A successful deploy ends with:

```
Uploaded shikkha24-frontend (… sec)
Deployed shikkha24-frontend triggers (… sec)
  https://shikkha24-frontend.abdullahalmamunmay.workers.dev
  shikkha24.com (custom domain)
  www.shikkha24.com (custom domain)
```

## ⚠️ The account-ID trap

Running `npx wrangler deploy` **without** the account ID fails with:

```
✘ [ERROR] A request to the Cloudflare API
  (/accounts/12ac4dfb5f604ab01f2ba6a0c4df8482/workers/services/shikkha24-frontend) failed.
  Authentication error [code: 10000]
```

**This is misleading, and it cost a real debugging session.** It reads like a bad token or
a broken login. It is neither. Wrangler is defaulting to a **stale account ID**
(`12ac4dfb…`) while the Worker actually lives in a **different** account
(`0e2e4a69…`) — one your login *does* have full access to. The same command succeeds once
the correct account is pinned.

How the two were told apart:

```bash
npx wrangler whoami          # shows the account(s) your login grants: 0e2e4a69…
```

Then confirm the Worker is really in that account:

```bash
CLOUDFLARE_ACCOUNT_ID=0e2e4a6986f91edabe1dae4945a9b88b \
  npx wrangler deployments list --name shikkha24-frontend
```

If that lists deployments, the account is right and the deploy will work.

The stale `12ac4dfb…` value is not in any repository file — it appears only in old wrangler
logs, so it is coming from wrangler's own cached state. Pinning the ID per-command is the
reliable fix. If it keeps recurring, clear the cache:

```bash
rm -rf ~/Library/Preferences/.wrangler   # then: npx wrangler login
```

## Publish to the CMS instead — no deploy needed for content

**Editing or publishing CMS content does not spend Actions minutes and needs no deploy.**
The CMS is a separate Next.js app on DianaHost; its admin, its database and its media
library are all independent of GitHub.

The only link between them is `DEPLOY_WEBHOOK_URL` in the **CMS server's** environment:

| `DEPLOY_WEBHOOK_URL` | What a publish does |
|---|---|
| **not set** | Nothing at all. Content is saved to the CMS. Zero GitHub usage. |
| **set** | Calls GitHub `repository_dispatch` → starts a workflow → **spends Actions minutes**, and fails while the budget is empty. |

Either way **the publish itself always succeeds.** When the budget is exhausted and that
variable is set, publishing simply queues no rebuild — run Step 1 and Step 2 above
afterwards and the new content appears.

## What still needs GitHub Actions

Only two things, and neither is urgent:

- **The CMS deploy** (`deploy.yml` → FTPS to DianaHost). Runs `payload migrate`, so it
  must stay gated on CI — do not hand-run migrations against production.
- **`backup-db.yml`**, a nightly cron. Run `pnpm run backup` by hand meanwhile.

## Verifying a deploy

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://shikkha24.com/
curl -sL https://shikkha24.com/admission/23/admission-policy-2027 | grep -c '<picture'   # covers
curl -s -o /dev/null -w '%{http_code}\n' \
  https://shikkha24.com/91fbd16cdf07709ad236e60bed652c13.txt                             # IndexNow key
```

Rollback is instant: Cloudflare dashboard → Workers → `shikkha24-frontend` → Deployments →
choose a previous version.


---

## Addendum — 2026-10-17 (deploy-day lessons; details in `.sps/handoff.md` START HERE)

1. **The login can drift, not just the account ID.** The account-ID trap above
   assumed the stored OAuth grant covers `0e2e4a69…`. On 2026-10-17 it did
   not — a fresh `wrangler login` as **Abdullahalmamunmay@gmail.com** was the
   actual fix. If `CLOUDFLARE_ACCOUNT_ID=0e2e…` still yields Authentication
   error 10000: `npx wrangler whoami` → the account must LIST `0e2e4a69…`;
   if it does not, re-login before debugging anything else.
2. **The build needs the CMS env.** Astro fetches all content at build time from
   `CMS_URL` (defaults to `http://localhost:3000` → silent thin build that
   ships EMPTY default content with 200s). `frontend/.env` with the four values
   now exists locally and Vite loads it automatically — do not delete it, do
   not commit it. Sanity check: the build log must NOT contain
   `[cms] Could not reach the CMS`. A `/api/faqs` 404 in that log IS expected
   until the P4 CMS deploy (the storefront intentionally falls back to its FAQ
   seed).
3. Shell state resets between sessions: `npx` exists only inside the CMS venv
   (`source /home/shikkhac/nodevenv/shikkha24-cms/24/bin/activate`), and pnpm
   flags differ from pnpm-config keys (`--config.minimum-release-age=0`, not
   `--minimum-release-age=0`).
