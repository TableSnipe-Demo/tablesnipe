# TableSnipe

Monitor OpenTable for open restaurant reservations and get notified via SMS. Confirm or decline bookings by replying to the text.

## Features

- **Monitor multiple restaurants** - Track availability by restaurant, day of week, time window, party size, and weeks ahead
- **SMS notifications via Twilio** - Get texted when a table opens up
- **Book via text** - Reply YES/NO to confirm or skip reservations
- **Dashboard** - Web UI to manage monitors, view notifications, and configure settings
- **Background polling** - Checks every 15 minutes automatically
- **Secret-gated** - App is protected by a shared secret

## Architecture

- **Backend**: FastAPI + SQLite + APScheduler (Python)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **SMS**: Twilio
- **Availability API**: OpenTable mobile API

## Setup

### Backend

```bash
cd tablesnipe-backend
cp .env.example .env
# Edit .env with your TABLESNIPE_SECRET
poetry install
TABLESNIPE_SECRET=your-secret poetry run fastapi dev app/main.py
```

### Frontend

```bash
cd tablesnipe-frontend
cp .env .env.local
# Edit .env.local if backend is not on localhost:8000
npm install
npm run dev
```

### Configuration (via Dashboard)

1. Open the frontend and log in with your secret
2. Go to **Settings** tab and configure:
   - **Twilio**: Account SID, Auth Token, Twilio phone number, your phone number
   - **OpenTable**: Bearer token (obtained from OpenTable mobile app network requests)
3. Go to **Monitors** tab to add restaurants to watch

### Finding an OpenTable Restaurant ID

Navigate to the restaurant on OpenTable. The restaurant ID is the numeric ID in the URL, e.g.:
`https://www.opentable.com/r/restaurant-name-city?restref=123456` -> ID is `123456`

### Twilio Webhook

Point your Twilio phone number's incoming message webhook to:
```
https://your-backend-url/api/twilio/webhook
```

## SMS Flow

1. System finds an available slot matching your monitor criteria
2. You receive: `"TableSnipe found a table! Restaurant: X, Date: Y, Time: Z. Reply YES 123 to book, or NO 123 to skip."`
3. Reply `YES 123` to attempt booking, or `NO 123` to skip
4. System attempts to lock the reservation or sends you a direct booking link
