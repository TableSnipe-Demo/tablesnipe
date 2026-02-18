# TableSnipe - Testing Guide

## Devin Secrets Needed
- **None required for local testing** — all core flows can be tested without external credentials
- Optional for full SMS testing: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_TO_NUMBER`

## Pre-Test Setup

1. Start backend: `cd tablesnipe-backend && poetry run fastapi dev app/main.py --port 8000`
2. Start frontend: `cd tablesnipe-frontend && npm run dev`
3. Open browser at http://localhost:5173
4. Optionally clean the DB: `rm -f tablesnipe-backend/tablesnipe.db` (backend auto-recreates it)

## Test Flows (No External Credentials Needed)

### Flow 1: Manual Monitor Creation
The OpenTable search API is broken (returns 404 as of Feb 2026). Use Manual mode:
1. Click "Manual" button in the Add Monitor card header
2. Enter restaurant name (e.g. "Nobu Malibu") and OpenTable ID (e.g. "77269")
3. Select days of week, party size, time, weeks ahead
4. Click "Add Monitor" → verify monitor appears in list with Active badge

### Flow 2: Monitor Toggle & Delete
1. Click the toggle switch on a monitor → verify badge changes to "Paused"
2. Click toggle again → verify badge changes back to "Active"
3. Add a second monitor, then click the trash icon → verify it's removed

### Flow 3: Settings Persistence
1. Click Settings tab, fill in Twilio Account SID, Auth Token, phone numbers
2. Click "Save Settings" → verify "Saved!" feedback on button
3. Reload page, click Settings tab → verify values persisted (auth token should be masked with dots)

### Flow 4: Twilio Webhook Simulation (via Konsole terminal on screen)
Insert test notifications directly into SQLite:
```python
python3 -c "
import sqlite3
conn = sqlite3.connect('tablesnipe-backend/tablesnipe.db')
c = conn.cursor()
c.execute(\"INSERT INTO notifications (monitor_id, restaurant_name, restaurant_id, slot_datetime, slot_hash, slot_token, party_size, status) VALUES (1, 'Test Restaurant', '12345', '2026-03-01T20:00', 'hash1', 'tok1', 2, 'pending')\")
conn.commit()
print('OK')
"
```

Then simulate webhook replies via Konsole (visible on screen for recording):
```bash
# Decline a reservation (notification ID 1)
curl -s -X POST http://localhost:8000/api/twilio/webhook -d "Body=NO 1&From=+15559876543"
# Expected: "Got it, skipping this reservation."

# Accept a reservation (notification ID 2) - will fail without real OT credentials
curl -s -X POST http://localhost:8000/api/twilio/webhook -d "Body=YES 2&From=+15559876543"
# Expected: "Sorry, couldn't lock that slot. It may have been taken."

# Duplicate reply (idempotency check)
curl -s -X POST http://localhost:8000/api/twilio/webhook -d "Body=YES 1&From=+15559876543"
# Expected: "This notification is already declined."
```

After running webhooks, click Notifications tab in browser → verify status badges updated (declined/failed).

### Flow 5: Search Mode Graceful Fallback
1. Ensure "Search" mode is active in Add Monitor card
2. Type any restaurant name in the search box
3. Observe "No results found. Try the **manual entry** mode instead." message
4. Click "manual entry" link → verify mode switches to Manual

## Known Limitations
- **OpenTable search API is broken** (returns 404 on all endpoints as of Feb 2026). The app handles this gracefully with manual entry mode.
- **Actual SMS sending** requires real Twilio credentials — cannot be tested without them
- **Actual booking** requires a valid OpenTable bearer token — cannot be tested without it
- **Background scheduler** polls every 15 minutes — test with "Check Now" button instead

## Tips
- When testing webhook flows, use Konsole terminal (visible on screen) rather than the bash tool, so the output is visible in the recording
- Insert test notifications directly into SQLite to bypass the need for real OpenTable availability data
- The auth token field in Settings is intentionally masked (shows dots) — this is correct behavior
- The "Check Now" button shows a spinner while running — wait for it to complete before checking results
