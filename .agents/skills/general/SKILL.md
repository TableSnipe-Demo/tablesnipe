# TableSnipe - General Development & Testing Guide

## Running the App Locally

### Backend
```bash
cd tablesnipe-backend
poetry install
poetry run fastapi dev app/main.py --port 8000
```
- API available at http://localhost:8000
- SQLite DB created at `tablesnipe-backend/tablesnipe.db`

### Frontend
```bash
cd tablesnipe-frontend
npm install
npm run dev
```
- Dashboard available at http://localhost:5173

## Devin Secrets Needed
- **None required for local testing** — the app runs fully locally without external credentials
- For full end-to-end SMS testing (optional): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_TO_NUMBER`
- For actual OpenTable booking (optional): `OPENTABLE_BEARER_TOKEN` (obtained from OpenTable mobile app network traffic)

## Architecture Overview
- **Backend**: FastAPI + SQLite (via SQLAlchemy) + APScheduler + Twilio SDK
- **Frontend**: React + Vite + Tailwind + shadcn/ui
- **Database**: SQLite at `tablesnipe-backend/tablesnipe.db`
- **Polling**: APScheduler runs every 15 minutes; "Check Now" button triggers immediate check
- **SMS flow**: Twilio sends SMS → user replies YES/NO → webhook at `/api/twilio/webhook` handles response

## Key API Endpoints
- `GET /api/monitors` — list all monitors
- `POST /api/monitors` — create monitor
- `DELETE /api/monitors/{id}` — delete monitor
- `PATCH /api/monitors/{id}/toggle` — toggle active/paused
- `GET /api/notifications` — list notifications
- `POST /api/twilio/webhook` — Twilio SMS webhook (form-encoded: `Body=YES 1&From=+1555...`)
- `POST /api/check-now` — trigger immediate availability check
- `GET /api/settings` — get settings
- `POST /api/settings` — save settings

## OpenTable API Status (as of Feb 2026)
The OpenTable mobile API (`https://mobile-api.opentable.com`) is **deprecated/broken** — all endpoints return 404. The app handles this gracefully:
- Restaurant search returns "No results found" with a link to manual entry mode
- Users can manually enter restaurant name + OpenTable ID (found in the URL: `opentable.com/r/restaurant-name-12345`)
- Availability checking will fail silently when no valid bearer token is configured
