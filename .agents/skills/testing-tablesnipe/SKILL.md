# Testing TableSnipe

## Overview
TableSnipe is a full-stack restaurant reservation monitoring app with:
- **Backend**: FastAPI + SQLite on port 8000 (`tablesnipe-backend/`)
- **Frontend**: React + Vite on port 5173 (`tablesnipe-frontend/`)

## Devin Secrets Needed
None required for basic UI/CRUD testing. For full SMS testing, you would need:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `USER_PHONE_NUMBER`

## How to Run Locally

### Backend
```bash
cd tablesnipe-backend
poetry run fastapi dev app/main.py --port 8000
```

### Frontend
```bash
cd tablesnipe-frontend
npm run dev
```

## Testing the App

### What Can Be Tested Without External Services
- Dashboard UI layout (3 tabs: Monitors, Notifications, Settings)
- Monitor CRUD: create, toggle active/inactive, delete
- Settings save/load and auth token masking
- Check Now button (poll trigger)
- Notifications tab empty state

### What Requires External Services
- OpenTable restaurant search (undocumented API, may return empty from non-browser environments)
- Twilio SMS sending and webhook handling

### OpenTable Search Workaround
The OpenTable search API (`/v2/autocomplete`) is undocumented and may return empty results when called from a server environment. If you need to test monitor creation without real search results, create a monitor directly via the browser console:

```javascript
fetch('http://localhost:8000/api/monitors', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    restaurant_id: '12345',
    restaurant_name: 'Test Restaurant',
    party_size: 4,
    days_of_week: [4, 5, 6],
    time_start: '18:00',
    time_end: '21:00',
    weeks_ahead: 4,
    active: true
  })
}).then(r => r.json()).then(console.log)
```

Then refresh the page to see the monitor in the UI.

### Verifying the Auth Token Security Fix
To confirm the auth token is not leaked in API responses:
1. Go to Settings tab, fill in a fake auth token, click Save Settings
2. Open DevTools → Network tab
3. Click on a `settings` fetch request
4. Click the Response tab
5. Verify that `twilio_auth_token` key is **absent** from the response
6. Only `twilio_auth_token_masked` should be present (e.g., `"my_s****2345"`)

### Expected UI Behaviors
- Settings badge shows "Not configured" (amber) or "Configured" (green) based on whether account SID, phone numbers are set
- After saving settings, auth token field shows masked version as placeholder text
- "Check Now" button shows "Checking..." spinner while polling, returns to normal after ~3 seconds
- Notifications tab shows pending count badge when there are pending notifications

## Known Limitations
- OpenTable availability check uses undocumented mobile API endpoints that may not work reliably
- No authentication on the dashboard or API - anyone with network access can read/write settings
- "YES to book" via SMS only marks the notification as confirmed; it does NOT actually book on OpenTable
