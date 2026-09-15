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
| **CI/CD secrets** | Deploy credentials to the host | Secret leakage via logs, forks, or a public repo |
| **Host media directory** (`data/media/`) | Media origin (R2 descoped in S9) | Directory listing, direct file access outside Payload's upload path |
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
| Host media directory | Served via CMS origin (public read intended) | Must not allow directory listing or direct write; only Payload's upload pipeline can create files |
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

Set at the origin via Apache `.htaccess`:

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

- **Static/editorial pages (no ads):** strict CSP — `default-src 'self'`, no `unsafe-inline` for scripts, explicit `img-src` naming the CMS/media host, `frame-ancestors 'none'`.
- **Ad-bearing pages:** a relaxed CSP that allowlists Google's ad domains and the minimum inline allowance AdSense requires.

**Which routes get the relaxed profile** (the authoritative list is the comment block in `frontend/public/.htaccess`):

| Route pattern | Why |
|---|---|
| `/` | Homepage — 4 ad slots + poll + newsletter |
| `/:category/:id/:slug` | Article — 3 ad slots + comments + bookmarks + video embeds |
| `/category/*` | Category listing — 1 ad slot |
| `/live/*` | Live blog — 1 ad slot + refresh island |
| `/quiz`, `/quiz/*` | Quiz — 2 ad slots |

⚠️ **Route dispatch is `SetEnvIf Request_URI` + `Header ... env=`, NOT `<LocationMatch>`.** Apache permits `<Location>`/`<LocationMatch>` in server and virtual-host context only. In `.htaccess` it is a core parser error — Apache answers **HTTP 500 to every request**, taking the entire site down. The dispatch therefore tags ad-bearing routes with `SetEnvIf Request_URI` and the two relaxed headers consume the tag. `SetEnvIf` and `Header` are both `FileInfo`-level overrides, which is what a cPanel host grants; `<If>` would need `AllowOverride All` and is deliberately avoided.

⚠️ **The article rule matches exactly three path segments and nothing else.** `/category/:slug/page/:n` is four segments, so it cannot collide. **Do not "simplify" it to a broad match** — that would relax the CSP for the whole site. Equally, **do not add a list of "reserved" first segments**: an earlier revision excluded `study-abroad`, which is both a two-segment listing *and* the first segment of real article URLs, so every study-abroad article silently fell to the strict profile and lost AdSense.

⚠️ **`Request_URI` includes the query string**, so every pattern tolerates a trailing `?…`. Without that, a reader arriving from a share link (`/?utm_source=whatsapp`) would get the strict profile and lose AdSense on that page view, with no error anywhere.

⚠️ **Verified by running Apache, not by parsing the file.** `pnpm verify:apache` serves the real `dist/` through the real `.htaccess` on a real Apache and asserts the status code, the CSP header count and each page's profile — deriving the expectation from the page's own JSON-LD so it does not share the rule's blind spots. The harness it replaced reimplemented the regex matching in JavaScript and passed while the file returned 500 sitewide; a reimplementation is not evidence.

⚠️ **Media host:** the `img-src` / `media-src` host is the DianaHost CMS origin (`cms.shikkha24.com`), **not** an R2 domain — R2 was removed on 2026-09-14. The literal host in `.htaccess` must match `PUBLIC_CMS_ORIGIN` / `PUBLIC_MEDIA_BASE_URL` exactly; a CSP cannot be templated.

⚠️ **Apache does NOT have the Cloudflare comma-join problem.** Apache's `Header set` replaces the value cleanly. The `!`-detach trick was Cloudflare-Pages-specific and is not needed with Apache.

⚠️ **Cache rules use the same mechanism, for the same reason.** `<FilesMatch>` matches the **basename**, not the path, so `<FilesMatch "\._astro/">` and `<FilesMatch "^/fonts/">` never matched a single file — both rules were dead and hashed assets were served with no long-lived cache. They are `SetEnvIf Request_URI` now. `<FilesMatch "\.html$">` genuinely is a basename rule and stays. Cache headers use `Header set` (not `always`) so a 404 is never cached for a year.

---

## 6. Input validation and content safety

- **Comments are the primary XSS vector.** Never render reader input as raw HTML. Escape on output, store sanitised, moderate before publish.
- **File uploads** (citizen journalism, avatars) — validate MIME type and extension server-side, cap size, store via Payload's upload pipeline (which writes to `data/media/` on the host disk, not the web root), never execute. Never trust the client-supplied content type.
- **Rich text from editors** is higher-trust but still sanitise on render — a compromised editor account should not be able to inject scripts.
- **CSRF** — Payload handles it for the admin; any custom endpoint (comments, newsletter, contact) needs its own token or origin check.
- **GraphQL** — disable introspection in production and enforce query depth/complexity limits if it is exposed publicly.
- **SQL/NoSQL injection** — use Payload's query layer; never string-concatenate queries.

---

## 7. Rate limiting

⚠️ **Honest constraint:** there is no CDN and therefore **no CDN-level rate limiting**. All rate limiting must be application-level (in-process on the CMS):

- Comment submission: per-IP and per-account throttle
- Newsletter signup: per-IP throttle + double opt-in
- Contact / citizen-journalism forms: per-IP throttle + a challenge
- Admin login: attempt counting with lockout
- Public API: per-IP cap

Document the limits chosen, and note that on a 2 GB shared host a flood can exhaust the process before any application limit applies — which is why the frontend is static HTML on disk (see `docs/reliability.md`).

---

## 8. Privacy and PII

- **Data minimisation:** collect only what a feature needs. Comments need a display name and a provider identity — not a phone number.
- **Retention policy:** define how long commenter accounts and newsletter subscribers are kept, and honour deletion requests.
- **Privacy policy page** is already in scope; it must describe what is collected, why, where it is stored (SQLite database and media files on DianaHost), and how to request deletion.
- **No selling or sharing reader data** with third parties.
- **Third-party processors to disclose:** the ESP (newsletter delivery, if configured), Facebook/Google (social login). No CDN or analytics processor — all data stays on DianaHost.
- **Bangladesh context:** there is no enacted comprehensive data-protection statute at the time of writing, but a privacy policy is required by Google's E-E-A-T expectations and by basic ethics. Do not treat "no law yet" as "no obligation".

---

## 9. Dependency and supply-chain security

**Zero coverage existed before this document.** The stack carries roughly a thousand transitive dependencies plus five native toolchains.

- Commit the lockfile; pin exact versions (already agent rule 8).
- Enable **Dependabot** (free on GitHub) for security advisories.
- Run `pnpm audit` in CI; decide an explicit policy on what severity fails the build.
- **Review install scripts.** Native-binary packages (Astro's Rust compiler, Tailwind Oxide, Rolldown, TypeScript 7's Go binaries, Pagefind) run post-install steps — treat major-version bumps as reviewable events, not routine. pnpm blocks post-install scripts by default; the allowed ones are listed explicitly in `pnpm-workspace.yaml` (`allowBuilds`), so a newly-added native dependency cannot silently execute code until someone adds it there.
- **Record the known freshness risk:** Payload 3.89.0 was published one day before being pinned (`.sps/plan.md`). An S0 decision on hold-vs-pin already exists.
- Never add an unreviewed package on the production host.

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
- [ ] Decide the `pnpm audit` failure policy (which severity blocks the build)
- [ ] Write the actual CSP for both profiles (with and without ads)
- [ ] Set SPF/DKIM/DMARC and choose the bulk-sending subdomain
- [ ] Decide whether `/admin` can be IP-restricted
- [ ] Draft the privacy policy content (needs the owner's data-handling decisions)
