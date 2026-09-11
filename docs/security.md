# Security Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S1 input. **Nothing in this domain existed before this document** — the project had only secrets-handling (agent rule 11).
**Why this exists:** the portal will store reader PII (social-login identities, newsletter emails), run a CMS admin panel on a shared host, accept user-generated comments, and hold the entire editorial archive in a SQLite file. None of that had a security plan.

---

## 1. Threat model

| Asset | Why it matters | Primary threats |
|---|---|---|
| **Reader PII** — names, emails, social identities, saved deadlines | Legal/ethical duty; breach destroys trust | Credential stuffing, insecure storage, over-collection |
| **Editor accounts** | Publishing power; reputational damage if hijacked | Weak passwords, phishing, credential stuffing, no 2FA |
| **Content integrity** | A defaced news site is a business-ending event | Compromised admin, unpatched dependency |
| **SQLite database** | Holds the entire archive | Direct file exposure via the web root |
| **The shared host account** | Hosts the CMS; shares an IP and machine with other tenants | Account compromise, cross-tenant risk, resource exhaustion |
| **CI/CD secrets** | Deploy credentials to the host and Cloudflare | Secret leakage via logs, forks, or a public repo |
| **R2 bucket** | Media origin | Misconfigured public write, hotlinking |
| **Newsletter sending reputation** | Deliverability for all domain email | Spam complaints, blacklisting, open relay |

**Who attacks:** opportunistic scanners (the largest volume by far), comment/SEO spammers, credential-stuffing bots, and automated dependency-based attacks. Not a targeted nation-state threat model.

---

## 2. Attack surface inventory

| Surface | Exposure | Notes |
|---|---|---|
| Payload admin (`/admin`) | Public internet | **Highest-value target.** Should be rate-limited and ideally IP-restricted |
| Payload REST/GraphQL API | Public | Must enforce collection access control, not just UI hiding |
| Comment submission | Public, unauthenticated-ish | User-generated content — the main XSS/spam vector |
| Newsletter signup | Public | Spam/enumeration vector |
| Social login callbacks | Public | OAuth misconfiguration risk |
| Contact / citizen-journalism forms | Public | Spam + file-upload risk |
| R2 bucket | Public read (intended) | Must never be public **write** |
| SQLite file | **Must not be web-accessible** | Verify the document root does not cover the CMS data directory |
| cPanel + SSH | Vendor-controlled | SSH is "on demand" — keep it off when unused |
| GitHub repo + Actions | Depends on visibility | Secrets must be Actions secrets, never in the repo |

---

## 3. Authentication and access control

### ⚠️ Runtime is end-of-life — an open risk

DianaHost runs **Node.js 20.18.2**. Node 20 reached **end of life on 2026-04-30**, so it receives **no security patches**. This is the single largest unmitigated security issue in the stack, because that runtime hosts the CMS admin — the highest-value target in the system.

- `next@16.3.4` and `@payloadcms/next@3.89.0` both accept `>=20.9.0`, so the stack *functions*.
- The cPanel **Node.js Selector** has a version drop-down; selecting 22.x or 24.x resolves this if DianaHost offers it.
- If it does not, this becomes an **accepted risk** requiring compensating controls: rate-limited and ideally IP-restricted admin, 2FA, dependency monitoring, and a note to DianaHost requesting a newer runtime.

### Controls

- **Payload RBAC** — the 5 roles already specified (Reporter, Section Editor, Editor-in-Chief, Ad Manager, Super Admin). Enforce **field-level** restrictions server-side: reporters cannot change publish date, status, or `is_breaking`.
- **Enforce access control at the API layer, not just the UI.** Hiding a button is not authorisation.
- **Strong password policy** + a password manager recommendation for editors.
- **2FA on every editor account** — *verify whether Payload 3.89 supports TOTP natively; if not, this is an accepted gap that must be recorded, not ignored.*
- **Login rate limiting and lockout** — the admin login is the single most attacked endpoint.
- **IP restriction on `/admin`** if the editorial team has stable IPs. If not, document the risk and lean on rate limiting.
- **Reader accounts** are limited to what comments and saved deadlines need. No role escalation paths.
- **Principle of least privilege** for the cPanel account and the CI deploy user — the deploy user needs file write, not full account control.

---

## 4. Secrets

- Real secrets live only in `.env` (git-ignored) and GitHub Actions secrets. `.env.example` is the only committed file.
- **Never log secrets.** CI logs are visible to anyone with repo access.
- **Rotate on any suspicion** — deploy keys, OAuth client secrets, ESP API keys.
- **Do not put secrets in client-side code.** Anything in an Astro island is public.
- The audit already flagged the supply-chain dimension: never paste tokens or user data into external services or URLs (agent hardening rule H2).

---

## 5. Security headers

Set at Cloudflare (or the origin if Cloudflare cannot):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Deny geolocation, camera, microphone except where a feature needs them |
| `X-Frame-Options` / `frame-ancestors` | Deny framing of the site (except the social-card previews if required) |
| `Content-Security-Policy` | See below |

### CSP — the realistic version

A strict CSP will break AdSense, which needs inline scripts and dynamic script injection. Two profiles:

- **Static/editorial pages (no ads):** strict CSP — `default-src 'self'`, no `unsafe-inline` for scripts, explicit `img-src` including the R2 domain, `frame-ancestors 'none'`.
- **Ad-bearing pages:** a relaxed CSP that allowlists Google's ad domains and the minimum inline allowance AdSense requires.

⚠️ A CSP that allows `unsafe-inline` and `unsafe-eval` globally provides little XSS protection. Document the relaxation explicitly rather than shipping a permissive policy everywhere.

---

## 6. Input validation and content safety

- **Comments are the primary XSS vector.** Never render reader input as raw HTML. Escape on output, store sanitised, moderate before publish.
- **File uploads** (citizen journalism, avatars) — validate MIME type and extension server-side, cap size, store outside the web root or in R2, never execute. Never trust the client-supplied content type.
- **Rich text from editors** is higher-trust but still sanitise on render — a compromised editor account should not be able to inject scripts.
- **CSRF** — Payload handles it for the admin; any custom endpoint (comments, newsletter, contact) needs its own token or origin check.
- **GraphQL** — disable introspection in production and enforce query depth/complexity limits if it is exposed publicly.
- **SQL/NoSQL injection** — use Payload's query layer; never string-concatenate queries.

---

## 7. Rate limiting

⚠️ **Honest constraint:** Cloudflare's free tier does **not** include configurable rate-limiting rules (those are a paid feature). Cloudflare free gives DDoS protection and basic bot mitigation only. Therefore application-level limits are required:

- Comment submission: per-IP and per-account throttle
- Newsletter signup: per-IP throttle + double opt-in
- Contact / citizen-journalism forms: per-IP throttle + a challenge
- Admin login: attempt counting with lockout
- Public API: per-IP cap

Document the limits chosen, and note that on a 2 GB shared host a flood can exhaust the process before any application limit applies — which is why the frontend is static on Cloudflare Pages (see `docs/reliability.md`).

---

## 8. Privacy and PII

- **Data minimisation:** collect only what a feature needs. Comments need a display name and a provider identity — not a phone number.
- **Retention policy:** define how long commenter accounts and newsletter subscribers are kept, and honour deletion requests.
- **Privacy policy page** is already in scope; it must describe what is collected, why, where it is stored (SQLite on DianaHost, media on Cloudflare R2), and how to request deletion.
- **No selling or sharing reader data** with third parties.
- **Third-party processors to disclose:** Cloudflare (CDN, R2, analytics), the ESP (newsletter delivery), Facebook/Google (social login).
- **Bangladesh context:** there is no enacted comprehensive data-protection statute at the time of writing, but a privacy policy is required by Google's E-E-A-T expectations and by basic ethics. Do not treat "no law yet" as "no obligation".

---

## 9. Dependency and supply-chain security

**Zero coverage existed before this document.** The stack carries roughly a thousand transitive dependencies plus five native toolchains.

- Commit the lockfile; pin exact versions (already agent rule 8).
- Enable **Dependabot** (free on GitHub) for security advisories.
- Run `npm audit` in CI; decide an explicit policy on what severity fails the build.
- **Review install scripts.** Native-binary packages (Astro's Rust compiler, Tailwind Oxide, Rolldown, TypeScript 7's Go binaries, Pagefind) run post-install steps — treat major-version bumps as reviewable events, not routine.
- **Record the known freshness risk:** Payload 3.89.0 was published one day before being pinned (`.sps/plan.md`). An S0 decision on hold-vs-pin already exists.
- Never `npm install` an unreviewed package on the production host.

---

## 10. Email authentication

The newsletter and any transactional email (password resets, comment notifications) need:

- **SPF** record authorising the sending path
- **DKIM** signing
- **DMARC** policy (start at `p=none` with reporting, then tighten)
- A **dedicated subdomain** for bulk sending (e.g. `mail.shikkha24.com`) so that a newsletter reputation problem cannot damage the main domain's transactional email

This was undocumented before. It is an S9 dependency.

---

## 11. Logging and audit

- Payload's built-in audit trail covers editorial actions — keep it enabled.
- Log authentication failures and rate-limit trips.
- Keep logs out of the web root.
- Review access logs after any suspected incident.

---

## 12. Open items

- [ ] Verify whether Payload 3.89 supports TOTP 2FA natively; if not, record it as an accepted gap
- [ ] Confirm the SQLite file and `.env` are outside the web root on DianaHost
- [ ] Decide the `npm audit` failure policy (which severity blocks the build)
- [ ] Write the actual CSP for both profiles (with and without ads)
- [ ] Set SPF/DKIM/DMARC and choose the bulk-sending subdomain
- [ ] Decide whether `/admin` can be IP-restricted
- [ ] Draft the privacy policy content (needs the owner's data-handling decisions)
