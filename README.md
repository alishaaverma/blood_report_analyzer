# Blood Report Analyzer — Next.js

A full-stack React + Next.js application for uploading blood-report PDFs,
extracting recognized test results, highlighting values outside configured
ranges, and showing educational diet, exercise, specialist, medicine, and
nearby-care guidance.

> This is an educational tool, not a medical device. It does not diagnose
> disease or prescribe treatment. Always consult a licensed clinician.

## Stack

- Next.js App Router + React + TypeScript
- Route handlers for authentication, uploads, profile, location, and admin actions
- Signed HTTP-only cookie sessions
- Node `scrypt` password hashing
- Switchable JSON-file or Google Sheets persistence
- Uploaded PDFs in `storage/reports/`
- Daily wellness tracking for steps, water, meals, goals, and reminders
- Daily exercise sessions with duration, intensity, suggestions, videos, and charts
- Local image assets in `public/images/` (no remote images)
- `pdfjs-dist` for text extraction from PDFs
- OpenStreetMap Nominatim and Overpass for location features

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The first registered account is made an admin so
a new local installation can be managed immediately. Emails listed in
`ADMIN_EMAILS` are also granted admin access at signup.

## Password recovery API

The browser recovery screens and JSON clients use the same three endpoints.
Send JSON with `Content-Type: application/json`:

```text
POST /api/auth/forgot-password
{ "email": "person@example.com" }

POST /api/auth/verify-otp
{ "requestId": "<id from step 1>", "code": "123456" }

POST /api/auth/reset-password
{ "requestId": "<id from step 1>", "resetToken": "<token from step 2>", "password": "new-secure-password" }
```

The first endpoint always uses a generic success message so it does not disclose
whether an email is registered. OTPs expire after 10 minutes, allow five failed
attempts, and cannot be requested more than once per minute for the same account.
OTP verification returns a high-entropy, one-time `resetToken`; a successful
password change consumes the request.

To deliver codes by email, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, and optionally `SMTP_FROM` in `.env.local`. Port 465 uses TLS;
other ports such as 587 use STARTTLS when offered. When SMTP is not configured,
the app runs in development email mode and prints the OTP only in the server
terminal.

## Commands

```bash
npm run dev       # development server
npm run build     # production build
npm start         # run the production build
npm run typecheck # TypeScript validation
npm run lint      # ESLint
npm run format    # format source files with Prettier
npm run format:check # verify formatting without modifying files
npm run sheets:migrate # copy the local JSON records to configured Google Sheets tabs
```

## Source organization

- `app/` — pages and HTTP route handlers
- `components/` — reusable server and client React components
- `lib/analysis.ts` — pure range analysis and health-guidance selection
- `lib/pdf.ts` — server-side PDF text extraction
- `lib/report-service.ts` — report storage, analysis, retry, and deletion lifecycle
- `app/api/health-tracker/` — authenticated tracker settings and daily log API
- `components/health-tracker.tsx` — progress cards, diet and weekly charts, and reminders
- `lib/validation.ts` — shared form and coordinate validation
- `lib/store.ts` — storage-backend selector and serialized update queue
- `lib/file-store.ts` — atomic local JSON persistence
- `lib/google-sheets-store.ts` — Google Sheets read/write adapter
- `public/images/` — all application-owned image files

The live `storage/runtime-data.json` file is created automatically and ignored
by Git because it contains account and report data. `storage/data.example.json`
shows the expected empty structure.

## Storage notes

The default `DATA_STORE_BACKEND=file` keeps application records in
`storage/runtime-data.json`. Setting it to `google-sheets` switches all existing
users, reports, reset requests, tracker profiles, and daily log reads and writes
to one Google spreadsheet.

Uploaded PDF files remain in `storage/reports/`; the spreadsheet stores their
metadata, analysis, and stored filename. Google Sheets is not appropriate binary
file storage. Serverless hosts generally provide an ephemeral filesystem, so use
durable object storage for PDFs before deploying this configuration there.

### Configure Google Sheets step by step

1. In Google Cloud, create a project, enable the Google Sheets API, and create a
   service account with a JSON key.
2. Create one Google spreadsheet and share it with the service account's
   `client_email` as an Editor. Copy the ID between `/d/` and `/edit` in its URL.
3. Copy `.env.example` to `.env.local`. Set the spreadsheet ID, service-account
   email, and private key, leaving `DATA_STORE_BACKEND=file` for the migration.
   The private key may use literal `\\n` sequences as shown in the example.
4. Run `npm run sheets:migrate`. It creates the required tabs, copies the local
   records, reads them back, and verifies collection counts. It refuses to
   replace a non-empty destination; `npm run sheets:migrate -- --force` is the
   explicit overwrite option.
5. Change `DATA_STORE_BACKEND=google-sheets` and restart the Next.js server.

The adapter creates these linked tabs automatically:

- `users`, `reports`, `report_results`, and `report_text_chunks`
- `password_resets` and `health_tracker_profiles`
- `daily_health_logs`, `meal_logs`, `exercise_logs`, and `daily_routine_items`
- `_store_meta`, which keeps consistent row counts for safe cleanup

Do not commit `.env.local` or a service-account JSON key. The workbook includes
password hashes, reset-token digests, health information, and extracted report
text, so restrict spreadsheet access to the minimum necessary people. This
adapter is intended for a small, single-server installation; use a transactional
database and encrypted object storage for a production medical-data system.

All application-owned images are local files under `public/images` and are
rendered with Next.js `Image`.

## Health tracker notes

The signed-in `/health-tracker` page stores tracker settings and daily logs in
the configured data backend. Steps can be entered from a phone, watch, or
pedometer, or estimated automatically from a supported phone's motion sensor
while the page remains open. Automatic estimates require HTTPS or localhost,
explicit sensor permission on some devices, and are not medical-grade counts.
Wake-up, bedtime, meal, water, and exercise notifications require browser
permission and work only while the tracker is open; they are convenience
reminders, not guaranteed alarms. The tracker also saves a daily healthy-routine
checklist and charts its seven-day completion history.

For signed-in users, the home page and dedicated `/daily-health-reports` page
convert saved daily tracker logs into searchable daily wellness reports. A
navbar link opens the dedicated page, while external PDF analysis remains
separate. Each daily report shows
goal-completion metrics, suggestions, and a recent consistency graph. Its score
measures logged habit completion only; it is not a medical health score or
diagnosis. Opening either dashboard creates that day’s record if one does not
already exist, so dates with no tracker entries remain visible as no-data
reports.

Exercise sessions can be recorded by name, duration, and intensity. The tracker
shows daily totals and a seven-day exercise chart, offers age/BMI-aware general
exercise ideas in a popup, links to NHS demonstrations and workout videos, saves
completion of each suggested daily workout task in the exercise history, and
supports a daily exercise reminder. Supported workout videos can play inside the
exercise popup through YouTube's privacy-enhanced player; demonstration-only
resources open in a separate tab. Suggestions are general wellness information
and are not physiotherapy or an individualized exercise prescription.

Step and water goals are user-editable. The app provides age-based activity
context and displays BMI only for adults age 20 or older when height and weight
are supplied. BMI is presented as a screening measure, not a diagnosis.

## PDF support

Text-based PDF reports are supported. Recognized lines follow the common format:

```text
Hemoglobin  13.5  g/dL  13.0 - 17.0
```

Scanned, image-only PDFs need OCR before upload; OCR is not bundled in this
Node.js migration.
