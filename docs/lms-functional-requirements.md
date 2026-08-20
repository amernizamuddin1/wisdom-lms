# Learning Management System — Functional Requirements

## 1. User Roles

Confirmed: single admin (you), no separate Instructor role for now.

- **Admin** — full control: courses, users, payments, analytics, across all your sites.
- **Subscriber / Student** — browses, buys, learns, downloads certificates.

Keep the `role` field on the `users` table anyway (see Section 13), even with only two roles in use. It costs nothing now and means adding an Instructor role later is a small change instead of a redesign.

---

## 2. Reusable Template & Subdomain Strategy

Not multi-tenant. Each website gets its own fully separate LMS deployment — own database, own users, own courses, own payment keys. What's shared is the **codebase**: you build it once, then spin up a fresh, independent copy for each new site.

**What "reusable" means in practice:**
- Payment gateway keys, database connection, and other secrets stay as environment variables (never admin-editable, for security).
- Visual branding — **logo** and the **certificate background template** (designed in Canva, uploaded as an image) — is managed through the admin console instead, stored in Supabase Storage, so you can update it anytime without touching code or redeploying. A single `settings` row per deployment holds these (see Section 13).
- Each deployment is entirely independent: a course, a user, a certificate created for WisdomQuant has no connection to anything in the Duas for Me instance. No shared login, no shared course list.

**How it connects to each website — confirmed approach: subdomain, no embedding.**
- The entire LMS — catalog, course pages, checkout, login, dashboard, course player — lives on its own subdomain, e.g. `academy.wisdomquant.com`.
- Your main website just links out to it (a "Courses" or "Academy" link in the nav, or a promotional page that points there). No iframe, no JS widget, nothing embedded inline in the main site's pages.
- This is the simplest option to build and maintain: one full Next.js app per site, pointed at via a DNS CNAME record from the subdomain to your hosting provider (free on Vercel's Hobby tier). No cross-origin issues, no iframe styling fights, full SEO on the academy pages themselves.

**Per-site setup checklist** (once the reusable template exists): create a new Supabase project → set the bootstrap `.env` values (Supabase connection + master encryption key) → deploy → point the site's subdomain (e.g. `academy.duasforme.com`) at it → log into the admin console and enter the logo, certificate template, and payment/email keys for that site → add a link from the main website's nav. That's the whole "launch for a new site" process — no code changes needed per site, just configuration through the admin console.

---

## 3. Public Website

- **Course catalog page** — grid/list of all published courses in this deployment, on the academy subdomain (e.g. `academy.wisdomquant.com`). Filters: category, free/paid, price range. Search by title.
- **Course detail page** — title, description, syllabus preview (chapter/lesson titles visible, content locked), price, duration, what's included (video hours, downloadable files, certificate), reviews/rating (optional, recommend adding).
- **Enroll button**:
  - Free course → instant enrollment, account created, redirected to dashboard.
  - Paid course → routes to checkout.

---

## 4. Payment Flow & Currency Selection

**Gateway split (recommended):**
- **INR** → Razorpay.
- **USD** or **EUR** → Stripe (Stripe handles both natively in one integration, so no extra logic needed per currency).

Step by step, in order:

1. User clicks "Enroll" on a paid course.
2. If not logged in, ask for name + email (this becomes the account).
3. **Detect country by IP** (via Cloudflare's `CF-IPCountry` header if you're behind Cloudflare, or a MaxMind GeoIP2 lookup otherwise) and map it to a default currency: India → INR, most others → USD, EU countries/UK → EUR. This is just a starting suggestion, not the final answer.
4. **Show a currency selector** (USD / EUR / INR) pre-set to that suggestion, but the user can change it to whichever they prefer.
5. Look up the course's price in the selected currency. If the admin hasn't set a price for that currency, fall back to USD.
6. Route to the matching gateway:
   - INR selected → create a Razorpay Order, open Razorpay Checkout.
   - USD or EUR selected → create a Stripe Checkout Session in that currency.
7. User completes payment.
8. Both gateways send a **webhook** to your server confirming payment success — treat the webhook as the source of truth, not the frontend "success" redirect, since that can be spoofed or interrupted.
9. On verified webhook (from either gateway): mark enrollment as active, generate account credentials (if new user), trigger the credentials email.
10. If payment fails: show a clear failure message, allow retry, don't create an account or enrollment.

**Pricing setup (admin side):** when creating a course, the admin sets:
- Price in INR — required.
- Price in USD — required (used as the fallback if a currency is missing).
- Price in EUR — optional, falls back to USD if left blank.

**Worth deciding later, not urgent:** should a logged-in user's currency be locked in at signup, so they can't switch currency on a later purchase just to get a cheaper price? Ship the simple version first and add this guard only if it turns out to matter.

**Free tier note:** neither Razorpay nor Stripe charge a monthly fee — both only take a per-transaction cut, so this stays "free" in the sense of no upfront cost, until you actually make a sale.

Additional things worth deciding, not urgent:
- **Coupons/discount codes** — apply per-currency so a discount doesn't accidentally use the wrong currency's price.
- **Refunds** — both Razorpay and Stripe support refund APIs; decide your refund policy before building this.
- **Invoices/GST** — for Indian customers you may need GST invoices. Stripe Tax can handle EU VAT automatically if turned on.

---

## 5. Account Creation & Login

1. On successful payment (or free enrollment), the system generates a random password and creates the user account with the given email.
2. Resend sends an email with: login URL, email/username, temporary password, and a prompt to change password after first login.
3. Login page — standard email + password.
4. Forgot password flow — standard "reset link sent to email" pattern.
5. User is prompted (or forced) to change the temporary password on first login.

Using Supabase Auth for this (see Section 12) means you don't hand-build password hashing, session handling, or reset-token logic — it's built in and free on Supabase's free tier.

---

## 6. Student Dashboard

- **My Courses** — list of enrolled courses, with progress bar (% complete) per course.
- **Profile** — name, email, phone, profile photo, change password.
- **Certificates** — list of earned certificates with download links (only appears once a course hits 100%).
- Clicking a course opens the course player (see Section 7).

---

## 7. Course Structure & Content Delivery

```
Course
 └── Chapter (you called this "Post Chapter")
      └── Lesson (you called this "sub-chapter")
           ├── Video (YouTube / Vimeo, mainly)
           ├── Closed captions (SRT file, admin-uploaded)
           ├── Downloadable file(s)
           └── Text instructions / notes
 └── Quiz (attached to a chapter, or to the whole course — decide per course)
      └── Questions (multiple choice, minimum pass score set by admin)
```

- Course player page: sidebar showing all chapters, lessons, and quizzes (with completion checkmarks), main area showing the selected item's content.
- **Video player**: embed via YouTube IFrame API / Vimeo Player SDK rather than a generic HTML5 player — gives access to play/pause events and native caption support.
- **Closed captions**: YouTube and Vimeo both support uploading caption tracks (.srt/.vtt) directly to the video on their platform — captions then render natively in the embedded player, no extra work on your side. Recommended over building a custom caption system.
- Lesson marked "complete" — manual "Mark as Complete" button (simplest, most reliable — YouTube/Vimeo embeds don't reliably expose watch-percentage events).
- Quiz marked "complete" — only once the student's score meets or exceeds the admin-set minimum pass percentage. Failed attempts allow retry.
- Downloadable files stored in **Supabase Storage** (S3-compatible, free tier included), served via signed/expiring URLs so files aren't publicly linkable outside the platform.

**Free tier note on video hosting:** Vimeo's free tier has real limits (weekly upload cap, limited storage, and a "powered by Vimeo" watermark isn't shown but some features are Pro-only). YouTube is fully free with no such caps, and its captions/embed support is just as good — if you're not attached to Vimeo for a specific reason, defaulting to YouTube (as unlisted/private videos, not public) avoids running into Vimeo's free-tier ceiling as you add more courses.

---

## 8. Progress Tracking

- Track completion at the **lesson** level (boolean: done/not done, plus timestamp) and **quiz** level (best score, pass/fail, attempts).
- Roll this up to **chapter progress** and **course progress** — a course is only 100% complete when all lessons are marked done AND all attached quizzes are passed at the minimum score.
- Both Student Dashboard and Admin Dashboard read from the same progress data — student sees their own, admin sees it per-user and aggregated per-course.

---

## 9. Certificate Generation

1. **Template setup (admin, one-time per certificate design)**: design the certificate layout in Canva, export it as a background image (PNG/JPG), and upload it through the admin console. This becomes the visual base for every certificate this deployment issues.
2. **Placeholder fields**: when setting up the template, the admin positions where the dynamic text should sit on top of the background image — student name, course name, completion date, and certificate ID (a unique verification code, not the raw internal course ID).
3. Trigger certificate generation only when: all lessons in the course are complete AND all quizzes are passed at or above the admin-set minimum score.
4. Server renders an HTML page combining the uploaded background image with the student's actual data filled into those positions, then converts it to PDF using Puppeteer (open the HTML like a browser, print to PDF — this preserves the Canva design exactly, including fonts and layout).
5. The PDF is stored in Supabase Storage, and a row is added to the `certificates` table, downloadable from the student's dashboard.
6. Optional but recommended: a public verification page (`academy.yoursite.com/verify/{certificate-id}`) so anyone can confirm a certificate is genuine using its certificate ID.

---

## 10. Admin Panel

**Course management:**
- Create/edit/delete courses, chapters, lessons — simple form-based UI with drag-and-drop reordering.
- Set price in each currency (INR, USD, EUR — see Section 4), or mark free.
- Upload thumbnail, write description.
- Upload/link videos and files per lesson.
- Publish/unpublish (draft mode before a course goes live).

**Branding & certificate settings:**
- Upload/replace the site logo.
- Upload/replace the certificate background template (designed in Canva), and position the dynamic fields (name, course, date, certificate ID) on it.

**Integration settings (new):**
- Enter/update Razorpay key ID, key secret, and webhook secret.
- Enter/update Stripe publishable key, secret key, and webhook secret.
- Enter/update Resend API key and sender email.
- These are editable anytime from the admin console — no code change or redeploy needed to rotate a key or switch from test to live mode. Stored encrypted in the database (see Section 13).

**User management:**
- List of all students, search/filter.
- View any student's enrolled courses and progress.
- Manually enroll a user in a course (support cases, freebies, bulk deals).

**Analytics dashboard:**
- Total subscribers (overall, per course).
- Total revenue (overall, per course, per time period).
- Enrollment trend over time (chart).
- Completion rate per course.
- Most/least popular courses.

---

## 11. Things You Didn't Mention But Should Plan For

- **Notifications beyond the credentials email**: enrollment confirmation, certificate-ready email, maybe a reminder email if a student hasn't logged in for a while — all via Resend.
- **Course reviews/ratings** — builds trust on the catalog page, low effort to add.
- **Mobile responsiveness** — course player and dashboard both need to work well on phones.
- **Search engine visibility (SEO)** for each site's public catalog, since each is effectively its own storefront.

---

## 12. Suggested Tech Stack (for building via Claude Code, free tier at launch)

Every piece below has a free tier that comfortably covers a launch-stage product with modest traffic. None of this needs a paid plan to get started.

- **Frontend + Backend**: Next.js (React), API routes in the same project — one codebase, deployed free on Vercel's Hobby tier, which also supports the multiple custom domains/subdomains you need for Section 2.
- **Database + Auth + Storage**: **Supabase** — Postgres database, built-in authentication (login, password reset, sessions), and S3-compatible file storage, all in one free-tier project. This replaces what would otherwise be three separate services (Postgres host + custom auth + AWS S3).
- **Email**: **Resend** for all transactional email (credentials, certificate-ready, reminders) — free tier covers a solid volume of monthly emails, simple API, good deliverability.
- **Payments**: Razorpay Orders API + Webhooks (INR), Stripe Checkout + Webhooks (USD/EUR). No monthly cost on either — per-transaction fees only.
- **PDF generation**: pdf-lib or Puppeteer (rendering an HTML certificate template to PDF).
- **Video hosting**: YouTube (unlisted videos) as the default, Vimeo optional per Section 7's free-tier note.

One thing to confirm as you build: Supabase's free tier pauses a project after a period of inactivity (it wakes back up on the next request, with a short delay) — fine for early launch, worth knowing if a demo needs to be "instantly" responsive with zero warm-up.

---

## 13. Suggested Database Tables (high level)

```
users (id, name, email, password_hash, role, created_at)
settings (id, logo_url, certificate_template_url, certificate_field_positions_json,
          razorpay_key_id_encrypted, razorpay_key_secret_encrypted, razorpay_webhook_secret_encrypted,
          stripe_publishable_key_encrypted, stripe_secret_key_encrypted, stripe_webhook_secret_encrypted,
          resend_api_key_encrypted, resend_sender_email)
courses (id, title, description, is_free, thumbnail_url, status, created_by)
course_prices (id, course_id, currency, amount)
chapters (id, course_id, title, order)
lessons (id, chapter_id, title, video_url, video_source_type, caption_url, instructions, order)
lesson_files (id, lesson_id, file_url, file_name)
quizzes (id, chapter_id or course_id, title, pass_percentage)
quiz_questions (id, quiz_id, question_text, options_json, correct_option, order)
quiz_attempts (id, user_id, quiz_id, score, passed, attempted_at)
enrollments (id, user_id, course_id, payment_id, enrolled_at, status)
lesson_progress (id, user_id, lesson_id, completed_at)
certificates (id, user_id, course_id, certificate_code, issued_at, file_url)
payments (id, user_id, course_id, gateway, gateway_order_id, gateway_payment_id, currency, amount, status)
```

Note: `settings` is a single-row table (one deployment = one site's config), holding branding, the certificate template, and every payment/email integration key — all `_encrypted` fields are encrypted before being written to the database, using a master encryption key that lives only in `.env` (never in the database itself, or the encryption would be pointless). No `sites` table and no `site_id` anywhere else — each deployment of this schema is its own independent instance, scoped to one website.

---

## 14. Suggested Build Order

1. Project setup + Supabase project + database schema (all tables from Section 13) + admin login. Set up the master encryption key in `.env` and the encrypt/decrypt helper functions now, since Step 4 depends on them.
2. Admin course creation (courses → chapters → lessons → quizzes), including video URL input and SRT caption handling.
3. Public catalog + course detail pages, deployed on the academy subdomain (see Section 2).
4. **Admin Integration Settings page** (enter/update Razorpay, Stripe, Resend keys, encrypted into the `settings` table) → then Razorpay integration (INR) + Stripe integration (USD/EUR) + webhooks for both, reading keys from `settings` instead of `.env` → account auto-creation + Resend credentials email.
5. Login + student dashboard + course player (video, captions, files, instructions) + quiz-taking + progress tracking.
6. Certificate generation.
7. Admin analytics dashboard.
8. Polish: coupons, reviews, reminder emails — whichever you decide to add later.

Building in this order means you have a fully working paid-enrollment-to-completion flow for WisdomQuant before you touch the second deployment for Duas for Me.

---

## 15. Working With Claude Code — Practical Notes

- **Give Claude Code this document first.** Have it read this whole file before writing any code.
- **Build one numbered step from Section 14 per session** (or per few sessions for the bigger ones). Don't ask for the whole app in one prompt.
- **Ask it to set up the database schema as a Prisma schema file** (Prisma can connect to your Supabase Postgres instance directly), reviewed by you before any feature code is written.
- **Test each step before moving to the next.** E.g., after Step 3, create a real test course through the admin UI and confirm it saves correctly before moving to Step 4.
- **Keep bootstrap secrets in environment variables**: Supabase URL/keys, database connection string, and the master encryption key. Everything else (Razorpay, Stripe, Resend keys) lives in the database, encrypted with that master key, editable from the admin console — confirm `.env` is in `.gitignore` regardless.
- **For captions**: tell Claude Code you're uploading captions on YouTube/Vimeo directly (Section 7), not building a custom caption system, to avoid it defaulting to the more complex approach.
- **For reuse**: when WisdomQuant's instance is fully working end-to-end, treat "launching for Duas for Me" as a separate, small project — duplicate the codebase, new Supabase project, new payment keys, new branding config, new subdomain. Don't build any shared/multi-tenant logic; each deployment stays fully independent, per Section 2.
- **Keys are requested just-in-time, not all upfront.** Claude Code will ask you to paste a specific API key into `.env` right when it's building the piece that needs it — e.g. it'll pause at Step 4 and ask for Razorpay/Stripe test keys before writing the payment integration, not before. You don't need every credential ready on day one, only the ones for Section 16's "before you start" list.

---

## 16. Pre-Work Checklist — Accounts & Access to Set Up

Split into when each one is actually needed, so you're not blocked mid-build but also not creating accounts you won't touch for weeks.

**Before the first Claude Code session (Step 1 needs these):**
- [ ] **GitHub account** — create an empty repository for the project.
- [ ] **Node.js installed locally**, and Claude Code installed and set up.
- [ ] **Supabase account** — create a new project (pick a region close to your users). From it, collect: Project URL, anon/public key, service role key, and the Postgres connection string. These go into `.env` before Step 1 begins.
- [ ] **Generate a master encryption key** (a random string Claude Code can help you generate) — goes into `.env` alongside the Supabase values, used only to encrypt/decrypt the payment and email keys you'll later enter through the admin console.

**Have accounts ready by the time you reach Step 4 (payments/email) — but the keys themselves go into the admin console, not `.env`:**
- [ ] **Razorpay account** — you can build immediately with **Test Mode** keys, no waiting. Start your business/KYC verification (PAN, bank details) now anyway, since approval for live payments can take a few days. You'll paste the key ID, key secret, and webhook secret into the admin console when you reach Step 4.
- [ ] **Stripe account** — same pattern: test mode works instantly; start business verification in parallel. Publishable key, secret key, and webhook secret go into the admin console.
- [ ] **Resend account** — sign up, generate an API key. Fine to test with Resend's sandbox sending domain at first; verify your own domain (a few DNS records) before real launch so emails don't land in spam. API key goes into the admin console.
- [ ] **Vercel account** — connect it to your GitHub repo for free hosting/deployment.
- [ ] **ngrok** (free) — or plan to test webhooks against a Vercel preview URL instead, since Razorpay/Stripe webhooks need a public URL to send events to, and your local machine isn't one.

**Only needed when you reach that specific step — no need to prepare now:**
- [ ] **Canva** — for designing the certificate template (Section 9), needed around Step 6.
- [ ] **DNS access for wisdomquant.com** — to point `academy.wisdomquant.com` at the deployed app, needed near the end once the app is live and working.

Everything in the first group is the actual "before you open Claude Code" list. The second group can be created today too if you'd rather get KYC/verification moving early, but it won't block Step 1 if you leave it for later.
