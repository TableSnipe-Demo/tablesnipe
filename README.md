# TableSnipe

Monitor OpenTable for restaurant reservation openings and get notified via SMS (Twilio). Confirm or decline bookings by replying to the text.

## Architecture

- **Backend**: FastAPI + SQLite + APScheduler (Python)
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui

## Features

- Search OpenTable restaurants and add monitors
- Configure day of week, time range, party size, and how many weeks ahead to watch
- Polls OpenTable every 15 minutes for availability
- SMS notifications via Twilio when slots open up
- Reply YES/NO to confirm or decline a booking
- Dashboard to manage monitors and Twilio settings

## Setup

### Backend

```bash
cd backend
cp .env.example .env  # Edit with your Twilio credentials
poetry install
poetry run uvicorn app.main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

### Twilio Webhook

Point your Twilio phone number's incoming SMS webhook to:
```
https://<your-backend-url>/api/webhooks/twilio
```

## Environment Variables

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `USER_PHONE_NUMBER` | Your personal phone number for notifications |
| `POLL_INTERVAL_MINUTES` | Polling interval (default: 15) |
