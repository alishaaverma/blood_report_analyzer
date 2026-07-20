# Blood Report Analyzer (Django)

Upload a lab/blood test report PDF → get it parsed line-by-line into a
digital report → automatic normal/abnormal analysis → personalized diet,
exercise, and doctor-consultation recommendations → nearby hospitals,
clinics, and pharmacies based on your location → where to buy any
recommended medicine (physical store + online store links) → full report
history per user → a staff admin panel to manage users and reports.

> ⚠️ **Not a medical device.** This project gives general, educational
> information based on simple rule-based range checks. It does **not**
> diagnose disease or prescribe medication — it always points the user to a
> licensed doctor. Please keep this framing if you extend the project.

---

## Features

- **Auth**: signup / login / logout, per-user profile (phone, age, gender, location)
- **PDF upload & parsing**: `pdfplumber` extracts text (with `pytesseract` OCR
  fallback for scanned PDFs); a line-by-line regex parser pulls out
  `test name / value / unit / reference range`
- **Analysis engine**: rule-based comparison against a `TestReference` table
  of normal ranges → flags each result Normal / High / Low
- **Recommendations**: if everything is normal → general diet + exercise tips;
  if something is abnormal → condition info, diet, exercise, "commonly
  associated medicines" (reference only, not a prescription), and which
  specialist to see
- **Nearby hospitals/clinics/pharmacies**: uses the browser's Geolocation API
  + the free OpenStreetMap Overpass API (no key needed) — or Google Places
  if you add an API key
- **Medicine sourcing**: curated physical-store entries + online store links
  (1mg / PharmEasy / Netmeds search links generated automatically)
- **Report history**: every report is stored per-user; users can revisit or
  delete their own past reports
- **Custom Admin Panel** (`/panel/`, staff-only): list all users → click a
  user → see their full profile + every report they've uploaded → delete a
  report or delete the whole user account. Django's built-in admin
  (`/django-admin/`) is also available for managing reference data
  (`TestReference`, `ConditionMapping`, `MedicineStore`).

---

## Project Structure

```
blood_report_analyzer/
├── config/              # Django project settings, urls, wsgi/asgi
├── accounts/            # Auth, user profile, geolocation capture
├── reports/             # PDF upload, parsing, analysis engine, report views
├── recommendations/     # ConditionMapping / GeneralRecommendation / MedicineStore
├── locator/              # Nearby hospital/clinic/pharmacy search
├── admin_panel/         # Custom staff dashboard (user & report management)
├── templates/           # HTML templates (server-rendered, no frontend framework needed)
├── static/css/          # Stylesheet
├── media/               # Uploaded PDFs (created at runtime)
├── requirements.txt
├── manage.py
└── .env.example
```

---

## Setup

### 1. Create a virtual environment & install dependencies

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. (Optional but recommended) OCR support for scanned PDFs

`pytesseract` needs the actual Tesseract binary installed on your machine:

- **Ubuntu/Debian**: `sudo apt install tesseract-ocr`
- **macOS**: `brew install tesseract`
- **Windows**: install from https://github.com/UB-Mannheim/tesseract/wiki

If Tesseract isn't installed, text-based PDFs still work fine — only
scanned/image-only PDFs need OCR.

### 3. Environment variables

```bash
cp .env.example .env
# edit .env — at minimum set DJANGO_SECRET_KEY for anything beyond local dev
```

### 4. Run migrations & create a superuser (for the admin panel)

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 5. Seed sample reference data (normal ranges, condition mappings, medicine stores)

```bash
python manage.py seed_data
```

This gives you working data for Hemoglobin, Fasting Glucose, Cholesterol,
WBC Count, Creatinine, Platelets, TSH, and Vitamin D out of the box — enough
to test the full upload → analyze → recommend flow immediately. Add more
via `/django-admin/` as needed.

### 6. Run the dev server

```bash
python manage.py runserver
```

Visit:
- `http://127.0.0.1:8000/` → redirects to your report dashboard (login first)
- `http://127.0.0.1:8000/accounts/signup/` → create an account
- `http://127.0.0.1:8000/panel/` → custom admin panel (staff/superuser only)
- `http://127.0.0.1:8000/django-admin/` → built-in Django admin (manage reference data)

---

## How the PDF parsing works

Lab report formats vary a lot between labs. The parser
(`reports/pdf_parser.py`) looks for lines matching the common pattern:

```
<Test Name>   <Value>   <Unit>   <RefMin> - <RefMax>
```

e.g. `Hemoglobin   13.5   g/dL   13.0 - 17.0`

This covers many standard lab formats out of the box. For labs with very
different layouts, extend `LINE_PATTERN` in `pdf_parser.py`, or add
per-lab parsing profiles.

## Extending the analysis

- Add more normal ranges: Django admin → **Reports → Test references**
- Add more condition/diet/exercise mappings: Django admin →
  **Recommendations → Condition mappings**
- Add real medicine store data: Django admin →
  **Recommendations → Medicine stores**

## Notes on going to production

- Switch `DATABASES` in `config/settings.py` to PostgreSQL (a commented
  example is already there)
- Move PDF parsing + analysis into a background task (e.g. Celery) if you
  expect large files or high traffic — currently it runs synchronously on
  upload
- Serve `media/` (uploaded PDFs) from cloud storage (e.g. S3) rather than
  local disk
- Set `DJANGO_DEBUG=False`, a real `DJANGO_SECRET_KEY`, and proper
  `DJANGO_ALLOWED_HOSTS`
- Consider adding a Google Places API key (`GOOGLE_PLACES_API_KEY` in
  `.env`) for richer nearby-place results (ratings, opening hours)
# Blood Report Analyzer

## Start the development server

Use the project launcher so Django always runs with the virtual environment
that contains `pdfplumber` and the other dependencies:

```powershell
.\run_server.ps1
```

Do not use `python manage.py runserver` unless the project virtual environment
is already activated. On Windows, `manage.py` will now automatically switch to
the bundled virtual environment as an additional safeguard.
