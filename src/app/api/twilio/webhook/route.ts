import { NextRequest, NextResponse } from "next/server";
import {
  getPendingAlerts,
  updateAlertStatus,
  getMonitor,
  getSetting,
} from "@/lib/db";
import { lockReservation, completeReservation } from "@/lib/opentable";
import { sendSMS, validateTwilioRequest } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  // Parse the incoming Twilio webhook (form-encoded)
  const formData = await request.formData();
  const body = formData.get("Body")?.toString().trim() ?? "";
  const from = formData.get("From")?.toString() ?? "";

  // Validate Twilio request signature
  const twilioSignature = request.headers.get("x-twilio-signature") ?? "";
  const baseUrl = getSetting("webhook_url");
  const webhookUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/twilio/webhook` : request.url;
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const authToken = getSetting("twilio_auth_token");
  if (authToken && !validateTwilioRequest(webhookUrl, params, twilioSignature)) {
    console.log(`[Twilio Webhook] Invalid signature, rejecting request`);
    return new NextResponse("Forbidden", { status: 403 });
  }

  console.log(`[Twilio Webhook] From: ${from}, Body: "${body}"`);

  // Validate it's from the expected user
  const userPhone = getSetting("user_phone_number");
  if (userPhone && from !== userPhone) {
    console.log(`[Twilio Webhook] Ignoring message from unknown number: ${from}`);
    return twimlResponse("Sorry, you are not authorized.");
  }

  // Parse response: "YES abc123" or "NO abc123"
  const match = body.match(/^(YES|NO)\s+([a-f0-9]{6})/i);

  if (!match) {
    return twimlResponse(
      "Reply format: YES <code> or NO <code>. Check your latest alert for the code."
    );
  }

  const action = match[1].toUpperCase();
  const alertCode = match[2].toLowerCase();

  // Find the matching pending alert
  const pendingAlerts = getPendingAlerts();
  const alert = pendingAlerts.find((a) =>
    a.id.toLowerCase().startsWith(alertCode)
  );

  if (!alert) {
    return twimlResponse(
      `No pending alert found for code "${alertCode}". It may have expired.`
    );
  }

  if (action === "NO") {
    updateAlertStatus(alert.id, "declined");
    return twimlResponse(
      `Got it - skipping ${alert.restaurant_name} on ${alert.date}.`
    );
  }

  // YES - attempt to book
  updateAlertStatus(alert.id, "confirmed");

  try {
    const monitor = getMonitor(alert.monitor_id);
    if (!monitor) {
      updateAlertStatus(alert.id, "error");
      return twimlResponse("Error: Monitor no longer exists.");
    }

    // Step 1: Lock the reservation
    const lockResult = await lockReservation(
      monitor.restaurant_id,
      alert.time_slot,
      monitor.party_size,
      alert.slot_hash ?? ""
    );

    // Step 2: Complete the reservation
    const booking = await completeReservation(
      monitor.restaurant_id,
      lockResult.id,
      alert.time_slot,
      monitor.party_size,
      alert.slot_hash ?? "",
      alert.slot_token ?? ""
    );

    updateAlertStatus(alert.id, "booked", {
      booking_confirmation: booking.confirmationNumber,
    });

    // Send confirmation SMS
    try {
      await sendSMS(
        `Booked! ${alert.restaurant_name} on ${alert.date} at ${formatTime(alert.time_slot)}. ` +
          `Confirmation: ${booking.confirmationNumber}`
      );
    } catch {
      // Non-fatal
    }

    return twimlResponse(
      `Booked ${alert.restaurant_name}! Confirmation: ${booking.confirmationNumber}`
    );
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error";
    updateAlertStatus(alert.id, "error");

    // Notify user of failure
    try {
      await sendSMS(
        `Booking failed for ${alert.restaurant_name}: ${errorMsg}. The slot may have been taken.`
      );
    } catch {
      // Non-fatal
    }

    return twimlResponse(
      `Sorry, booking failed: ${errorMsg}. The slot may have been taken.`
    );
  }
}

function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatTime(dateTimeStr: string): string {
  const timePart = dateTimeStr.includes("T")
    ? dateTimeStr.split("T")[1]
    : dateTimeStr;
  const [hours, minutes] = timePart.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}
