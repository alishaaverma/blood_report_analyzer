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
- JSON file persistence in `storage/data.json`
- Uploaded PDFs in `storage/reports/`
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

## Commands

```bash
npm run dev       # development server
npm run build     # production build
npm start         # run the production build
npm run typecheck # TypeScript validation
npm run lint      # ESLint
```

## Storage notes

This project intentionally stores application data and uploaded files on disk,
as requested. It is suitable for local or single-server deployment. Serverless
hosts generally provide an ephemeral filesystem; for those environments,
replace `lib/store.ts` with a database adapter and `storage/reports` with durable
object storage.

All application-owned images are local files under `public/images` and are
rendered with Next.js `Image`.

## PDF support

Text-based PDF reports are supported. Recognized lines follow the common format:

```text
Hemoglobin  13.5  g/dL  13.0 - 17.0
```

Scanned, image-only PDFs need OCR before upload; OCR is not bundled in this
Node.js migration.
