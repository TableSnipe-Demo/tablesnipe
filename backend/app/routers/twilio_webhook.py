from fastapi import APIRouter, Form, Response
from app.database import get_db
from app.services.twilio_sms import send_sms

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


@router.post("/webhook")
async def twilio_webhook(Body: str = Form(""), From: str = Form("")):
    body = Body.strip().upper()
    parts = body.split()

    response_text = "Sorry, I didn't understand that. Reply 'YES <id>' to book or 'NO <id>' to skip."

    if len(parts) == 2:
        action = parts[0]
        try:
            alert_id = int(parts[1])
        except ValueError:
            send_sms(From, response_text)
            return Response(content="<Response></Response>", media_type="application/xml")

        conn = get_db()
        alert = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()

        if not alert:
            send_sms(From, f"Alert #{alert_id} not found.")
        elif action == "YES":
            conn.execute("UPDATE alerts SET status = 'confirmed' WHERE id = ?", (alert_id,))
            conn.commit()
            send_sms(
                From,
                f"Confirmed! Reservation at {alert['restaurant_name']} on {alert['date']} at {alert['time']} for {alert['party_size']}. "
                f"Please complete your booking on OpenTable.",
            )
        elif action == "NO":
            conn.execute("UPDATE alerts SET status = 'denied' WHERE id = ?", (alert_id,))
            conn.commit()
            send_sms(From, f"Got it, skipping reservation at {alert['restaurant_name']} on {alert['date']}.")
        else:
            send_sms(From, response_text)

        conn.close()
    else:
        send_sms(From if From else "", response_text)

    return Response(content="<Response></Response>", media_type="application/xml")
