# TableSnipe

Monitor OpenTable for restaurant reservations and get notified via SMS when spots open up. Confirm or decline bookings by replying to the text.

## Features

- **OpenTable Monitoring**: Polls OpenTable's API every 15 minutes for available reservation slots
- **SMS Alerts via Twilio**: Get texted when a slot opens at your target restaurant
- **Text-to-Book**: Reply YES or NO to confirm/decline a booking
- **Dashboard**: Web UI to manage monitors, view alerts, and configure settings
- **Secret-Gated Access**: App is protected by a secret key

## Setup

### Prerequisites
- Node.js 20+
- OpenTable bearer token (from mobile app network traffic)
- Twilio account (Account SID, Auth Token, phone number)

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first visit, enter a secret key (this becomes your access password).

### Configuration

1. Go to **Settings** tab in the dashboard
2. Enter your **Twilio** credentials (Account SID, Auth Token, phone numbers)
3. Enter your **OpenTable** bearer token
4. Set the **Webhook URL** to your public URL so Twilio can send incoming SMS to `/api/twilio/webhook`

### Adding Monitors

1. Go to **Monitors** tab
2. Click **+ Add Monitor**
3. Search for a restaurant or enter the OpenTable restaurant ID manually
4. Select days of the week, time window, party size, and how many weeks ahead to look
5. The scheduler polls every 15 minutes automatically

### SMS Flow

When availability is found:
1. You receive a text: `"TableSnipe: [Restaurant] has an opening! Date: ... Time: ... Reply YES abc123 to book"`
2. Reply `YES abc123` to book, or `NO abc123` to skip
3. If booked, you'll get a confirmation text with the booking number

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Authenticate with secret |
| GET/POST | `/api/settings` | View/update settings |
| GET/POST | `/api/monitors` | List/create monitors |
| PUT/DELETE | `/api/monitors/[id]` | Update/delete a monitor |
| POST | `/api/poll` | Trigger a manual poll |
| GET/POST | `/api/scheduler` | View/control the scheduler |
| GET | `/api/alerts` | View alert history |
| GET | `/api/restaurants/search` | Search OpenTable restaurants |
| POST | `/api/twilio/webhook` | Twilio incoming SMS webhook |

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SQLite** via better-sqlite3
- **Twilio** Node.js SDK
- **OpenTable** mobile API
