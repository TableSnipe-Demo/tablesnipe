# TableSnipe

Monitor OpenTable for restaurant reservation openings and get notified via SMS. Confirm or decline bookings by replying to the text.

## Features

- **OpenTable Integration** — Search restaurants and monitor availability via OpenTable's API
- **Twilio SMS** — Get notified when a slot opens; reply YES/NO to book or skip
- **Dashboard** — Web UI to configure monitors, Twilio settings, and view notification history
- **Configurable Monitors** — Set restaurant, day of week, time of day, party size, and weeks ahead
- **15-Minute Polling** — Background scheduler checks for openings automatically
- **Manual Poll** — "Check Now" button to trigger an immediate scan

## Architecture

```
tablesnipe-backend/   — FastAPI + SQLite + APScheduler + Twilio SDK
tablesnipe-frontend/  — React + Vite + Tailwind + shadcn/ui
```

## Setup

### Backend

```bash
cd tablesnipe-backend
cp .env.example .env
poetry install
poetry run fastapi dev app/main.py
```

Backend runs at http://localhost:8000

### Frontend

```bash
cd tablesnipe-frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Configuration

1. Open the dashboard at http://localhost:5173
2. Go to **Settings** tab and enter your Twilio credentials (Account SID, Auth Token, From/To phone numbers)
3. Optionally add an OpenTable bearer token (needed for booking, obtained from OpenTable mobile app network traffic)
4. Set your Twilio number's incoming message webhook to: `http://<your-server>/api/twilio/webhook` (POST)
5. Go to **Monitors** tab, search for a restaurant, configure day/time/party size/weeks ahead, and add it

## SMS Flow

1. Scheduler polls OpenTable every 15 minutes for each active monitor
2. When a matching slot is found, you receive an SMS like:
   ```
   TableSnipe: Restaurant Name has an opening!
   Date/Time: 2026-03-15T19:00
   Party size: 2

   Reply YES 1 to book, or NO 1 to skip.
   ```
3. Reply `YES 1` to book the reservation, or `NO 1` to skip

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| GET | `/api/restaurants/search?q=` | Search OpenTable restaurants |
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create a monitor |
| PUT | `/api/monitors/:id` | Update a monitor |
| DELETE | `/api/monitors/:id` | Delete a monitor |
| GET | `/api/notifications` | List recent notifications |
| GET | `/api/settings` | Get settings (sensitive values masked) |
| PUT | `/api/settings` | Update settings |
| POST | `/api/poll` | Trigger immediate poll |
| POST | `/api/twilio/webhook` | Twilio incoming SMS webhook |
