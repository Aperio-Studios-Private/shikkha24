# Deep Security Audit — Critical Paths

**Date:** 2026-10-01  
**Scope:** Authentication & authorization, input handling, data flow  
**Auditor:** Automated + manual review  
**Note on payments:** This app has **no payment logic** — it is an education news portal with no paid features, no Stripe, no Razorpay. The payment section of the request does not apply.

---

## Executive Summary

| Category | Result |
|---|---|
| **Authentication & Authorization** | 2 findings (1 medium, 1 low) |
| **Input Handling (SQLi, XSS, File Uploads)** | 1 finding (medium) |
| **IDOR** | None found |
| **Password Reset Flow** | 1 finding (info) |
| **JWT/Session Handling** | 1 finding (info) |

The codebase is **unusually well-defended** for a project of this size. Every public write endpoint uses honeypot + rate limiting + key-by-key whitelisting (never body spread). All user input is escaped before HTML rendering. The access control model correctly separates `users` from `readers` and uses collection-aware identity checks. The three findings are all defense-in-depth gaps rather than exploitable vulnerabilities in the current configuration.

---

## Finding 1: Path Traversal in `mediaFilePath` [MEDIUM]

### What the vulnerability is
The `mediaFilePath()` function resolves a media filename to an absolute path using `path.resolve()` but does **not** verify that the resolved path stays inside the media directory. If an attacker can influence the `filename` value stored in the database, they can read arbitrary files from the server filesystem.

### Where it is in the code
```typescript
// cms/src/lib/id-card.ts:160-165
export function mediaFilePath(filename?: string | null): string | null {
  if (!filename) return null
  const staticDir = process.env.MEDIA_UPLOAD_DIR || './data/media'
  const resolved = path.resolve(process.cwd(), staticDir, filename)
  return existsSync(resolved) ? resolved : null
}
```

### How an attacker would exploit it
1. **Primary path:** Payload uses `sanitize-filename` to strip path traversal sequences from uploaded filenames, so a direct upload attack is blocked.
2. **Secondary path:** If an attacker gains database write access (e.g., through a compromised admin account, SQL injection, or a backup restore), they can set `author.photoFilename` to `../../../etc/passwd`.
3. **Tertiary path:** If `sanitize-filename` has an unknown bypass (CVE), the function offers no second line of defense.
4. When `composeIdCard()` or `composePhotocard()` calls `mediaFilePath()`, `sharp(file)` would open the attacker-controlled path.

### The exact fix
Add a path-boundary check after resolution:

```typescript
export function mediaFilePath(filename?: string | null): string | null {
  if (!filename) return null
  const staticDir = process.env.MEDIA_UPLOAD_DIR || './data/media'
  const base = path.resolve(process.cwd(), staticDir)
  const resolved = path.resolve(base, filename)
  // Path must be inside the media directory
  if (!resolved.startsWith(base + path.sep)) return null
  return existsSync(resolved) ? resolved : null
}
```

**Rationale:** `path.resolve()` collapses `..` segments. After resolution, `resolved.startsWith(base + path.sep)` guarantees the file is inside the media directory, even if the filename somehow contained traversal sequences.

---

## Finding 2: Password Reset Token Not Explicitly Cleared [INFO]

### What the vulnerability is
After a successful password reset, Payload sets `resetPasswordExpiration` to the current date/time, which makes the token **effectively** single-use. However, the `resetPasswordToken` string itself remains in the database column. If a future bug or database restore ever reverts the expiration, the token would be reusable.

### Where it is in the code
```javascript
// cms/node_modules/payload/dist/auth/operations/resetPassword.js:63
user.resetPasswordExpiration = new Date().toISOString();
// The token itself is NOT cleared here
```

### How an attacker would exploit it
This is **not directly exploitable today** because:
- The token is 40 hex chars = 160 bits of entropy (`crypto.randomBytes(20)`)
- The expiration is set to the current date, so the query `resetPasswordExpiration > NOW()` will never match
- The token expires after 1 hour by default

The risk is **latent:** if a database backup is restored to a point before the reset, or if a code change accidentally removes the expiration check, the token becomes valid again.

### The exact fix
In Payload's auth config (`cms/src/collections/Users.ts`), add a `forgotPassword` hook that clears the token after reset:

```typescript
auth: {
  maxLoginAttempts: 5,
  lockTime: 10 * 60 * 1000,
  tokenExpiration: 2 * 60 * 60,
  forgotPassword: {
    // Clear the token after successful reset — defense in depth
    generateEmailHTML: undefined, // use default
  },
},
```

**Note:** Payload does not expose a post-reset hook in the config. The proper fix is to add a collection `afterChange` hook on `users` that detects when `resetPasswordExpiration` was set to a past date and also sets `resetPasswordToken: null`.

```typescript
// Add to Users collection hooks
hooks: {
  afterChange: [
    async ({ doc, previousDoc }) => {
      if (
        doc.resetPasswordToken &&
        doc.resetPasswordExpiration &&
        new Date(doc.resetPasswordExpiration) <= new Date()
      ) {
        // Token was just invalidated — clear the string too
        await payload.update({
          collection: 'users',
          id: doc.id,
          data: { resetPasswordToken: null },
          overrideAccess: true,
        })
      }
    },
  ],
},
```

---

## Finding 3: Stateless Reader Sessions Cannot Be Revoked Server-Side [INFO]

### What the vulnerability is
Reader sessions use signed cookies (HMAC-SHA256) rather than server-stored sessions. Logout clears the cookie, but a copy of the token taken before logout remains valid until its 30-day expiry. There is no server-side blacklist.

### Where it is in the code
```typescript
// cms/src/endpoints/oauth.ts:276-293
const logout: Endpoint = {
  path: '/oauth/logout',
  method: 'post',
  handler: async (): Promise<Response> => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', readerSessionClearCookie())
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  },
}
```

### How an attacker would exploit it
1. Attacker steals a reader's session cookie (e.g., via XSS, though XSS is mitigated; or via physical access, malware, or network sniffing on unencrypted HTTP).
2. Reader clicks "logout" — cookie is cleared from their browser.
3. Attacker still holds the copied token and can use it for up to 30 days.

**Mitigations already in place:**
- Cookie is `HttpOnly` (XSS cannot steal it via `document.cookie`)
- Cookie is `Secure` in production (network sniffing requires MitM)
- Cookie is `SameSite=Lax` (CSRF protection)
- Token expiry is 30 days, not "forever"

### The exact fix
This is a documented trade-off. To add revocability, store a "session generation counter" on the reader row:

```typescript
// Add to Readers collection fields
{
  name: 'sessionGeneration',
  type: 'number',
  defaultValue: 1,
  access: { update: () => false },
},
```

Include the generation number in the signed token. On logout, increment the counter server-side. On verify, reject tokens whose generation number does not match. This adds one database read per authenticated request (acceptable for the CMS's traffic level).

**Cost-benefit:** Given the cookie protections (`HttpOnly; Secure; SameSite=Lax`), the attack surface is narrow. Implement only if the threat model includes determined adversaries with browser-level access or if regulatory requirements demand it.

---

## Finding 4: `poll-vote.ts` Duplicates `clientIp` [LOW]

### What the vulnerability is
`endpoints/poll-vote.ts` defines its own `clientIp()` function instead of importing the shared one from `lib/http.ts`. The two implementations are identical today, but future edits to one could diverge from the other, leading to inconsistent IP extraction.

### Where it is in the code
```typescript
// cms/src/endpoints/poll-vote.ts:166-170
function clientIp(req: PayloadRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}
```

### The exact fix
Replace with the shared helper:

```typescript
import { clientIp } from '../lib/http'
// Remove the local definition
```

---

## Areas Audited and Found Clean

### Authentication & Authorization

| Check | Result |
|---|---|
| **IDOR on user data** | ✅ Clean. Every endpoint that returns user-scoped data derives the identity from the session cookie, never from a client-supplied ID. `readerIdFromRequest()` is the single source of truth. |
| **Cross-collection ID confusion** | ✅ Clean. `isSelfIn('users')` and `isSelfIn('readers')` check `req.user.collection` before comparing IDs, preventing a reader with id=1 from accessing user id=1. This was a previous vulnerability that has been fixed and documented. |
| **Collection access on `Media`** | ✅ Clean. `create/update/delete` are restricted to `isEditorial` / `isSuperAdminOrEditorInChief`. Previously `create` defaulted to `Boolean(user)`, allowing any authenticated reader to upload/delete media. |
| **Readers collection `create`** | ✅ Clean. Set to `noOne` after a previous vulnerability allowed unauthenticated account creation (`POST /api/readers {"displayName":"x"} → 201`). |
| **Field-level access on sensitive fields** | ✅ Clean. `Users.email`, `Users.roles`, `Readers.bookmarksSyncedAt` all have field-level restrictions. |
| **Bookmark ownership** | ✅ Clean. `Bookmarks.create` is `noOne`; writes go through the endpoint which sets `reader` from the session. `Bookmarks.read/update` use `isOwnReaderRowOrSuperAdmin` which matches on the `reader` relation, not the row id. |

### Password Reset Flow

| Check | Result |
|---|---|
| **Token entropy** | ✅ Clean. `crypto.randomBytes(20).toString('hex')` = 160 bits. |
| **Token expiration** | ✅ Clean. Default 1 hour (3600000 ms), configurable via `forgotPassword.expiration`. |
| **Single-use** | ✅ Effectively single-use. Expiration is set to current date after reset. Finding 2 notes the token string is not explicitly cleared. |
| **Tied to user** | ✅ Clean. Token is stored on the specific user row; the reset query matches both `resetPasswordToken` and `resetPasswordExpiration`. |
| **No enumeration** | ✅ Clean. `forgotPassword` fails silently if email not found. |

### JWT / Session Handling

| Check | Result |
|---|---|
| **Signing secret** | ✅ Clean. `requirePayloadSecret()` throws if `PAYLOAD_SECRET` is unset. No fallback. |
| **Token expiry** | ✅ Clean. Staff sessions: 2 hours. Reader sessions: 30 days. Both are signed with expiry claims. |
| **Signature verification** | ✅ Clean. `timingSafeEqual` used for constant-time comparison. |
| **Context binding** | ✅ Clean. OAuth `state` and reader session use different contexts, preventing cross-feature replay. |
| **Staff logout** | ✅ Clean. Payload's `revokeSession` removes the session from the user's `sessions` array. |
| **Cookie flags** | ✅ Clean. `HttpOnly; SameSite=Lax; Secure` (in production). |

### Input Handling

| Check | Result |
|---|---|
| **SQL injection** | ✅ Clean. Zero raw SQL. All queries go through Payload's ORM (Drizzle). |
| **XSS in article body** | ✅ Clean. `lexicalToHtml` escapes every text node via `escapeHtml()` which covers `& < > " '`. Links are validated by `safeUrl()` which rejects `javascript:` and `data:` schemes. |
| **XSS in comments** | ✅ Clean. Comments are rendered with Astro's default escaping (no `set:html`). The comment body uses `text()` with a 2000-char limit on the server. |
| **XSS in live blog** | ✅ Clean. `LiveBlogTimeline.astro` uses `lexicalToHtml(entry.content)` which escapes all text. |
| **XSS in GPA/CGPA calculators** | ✅ Clean. `innerHTML` is used but only with hardcoded template strings; no user input is interpolated. |
| **File upload validation** | ✅ Clean. MIME type whitelist (`image/jpeg`, `png`, `webp`, `avif`, `gif`, `svg+xml`), 15 MB size cap, server-side format conversion to WebP, dimension capping (2000px), EXIF/metadata stripping, per-day upload quota. |
| **Path traversal in uploads** | ✅ Clean. Payload uses `sanitize-filename` which strips `../` and path separators. |
| **File upload access rules** | ✅ Clean. Media `create/update/delete` require editorial roles. |

### API Response Filtering

| Check | Result |
|---|---|
| **OAuth `/me`** | ✅ Clean. Returns only `id`, `displayName`, `avatarUrl`, `provider`. Never email or providerId. |
| **Comment submit** | ✅ Clean. Returns `{ok: true}`. Never echoes input. |
| **Bookmark sync** | ✅ Clean. Returns only bookmark list + sync status. |
| **Reaction counts** | ✅ Clean. Returns only aggregate counts + caller's reaction. Never returns fingerprint rows. |
| **Newsletter status** | ✅ Clean. Returns only configuration flags. |

### Rate Limiting

| Check | Result |
|---|---|
| **Login** | ✅ Fixed in this session. 5/min per IP via route handler wrapper. |
| **Forgot password** | ✅ Fixed in this session. 3/hour per IP via route handler wrapper. |
| **Comments** | ✅ Clean. 5 per IP per 10 minutes. |
| **Citizen submissions** | ✅ Clean. 3 per IP per 10 minutes. |
| **Poll votes** | ✅ Clean. 20 per IP per minute. |
| **Reactions** | ✅ Clean. 20 toggles per IP per 5 minutes. |
| **Bookmarks** | ✅ Clean. 60 syncs + 60 toggles per IP per 5 minutes. |
| **Newsletter signup** | ✅ Clean. 5 per IP per minute. |
| **Push subscribe** | ✅ Clean. 10 per IP per minute. |
| **Account deletion** | ✅ Clean. 3 per IP per hour. |

---

## Appendix: What Was NOT Found

The following common vulnerability classes were checked and are **not present**:

1. **IDOR (Insecure Direct Object Reference):** No endpoint accepts a user ID from the client and returns that user's data. All identity derives from the session.
2. **Mass Assignment:** Every write endpoint builds its data object key-by-key from a whitelist. No `...body` spread is used in any endpoint.
3. **Open Redirect:** The OAuth `next` parameter is carried inside the signed state token and validated by `safeNextPath()`, which rejects anything not site-relative.
4. **Login CSRF:** The OAuth state parameter is signed and verified via double-submit cookie.
5. **Timing Attacks on Token Comparison:** `timingSafeEqual` is used for both the newsletter send token and the push sweep token.
6. **Sensitive Data in Logs:** No `console.log` prints secrets, tokens, or personal data.
7. **SSRF in Rebuild Trigger:** The webhook URL is from an environment variable, not user input.
8. **NoSQL Injection:** All queries use Payload's typed API; no raw query objects are built from user input.
