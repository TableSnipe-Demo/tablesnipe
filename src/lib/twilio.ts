import twilio from "twilio";
import { getSetting } from "./db";

function getTwilioClient() {
  const accountSid = getSetting("twilio_account_sid");
  const authToken = getSetting("twilio_auth_token");

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }

  return twilio(accountSid, authToken);
}

export async function sendSMS(body: string): Promise<string> {
  const client = getTwilioClient();
  const from = getSetting("twilio_phone_number");
  const to = getSetting("user_phone_number");

  if (!from || !to) {
    throw new Error("Phone numbers not configured");
  }

  const message = await client.messages.create({
    body,
    from,
    to,
  });

  return message.sid;
}

export function formatAlertMessage(
  restaurantName: string,
  date: string,
  timeSlot: string,
  partySize: number,
  alertId: string
): string {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const formattedTime = formatTime(timeSlot);

  return (
    `TableSnipe: ${restaurantName} has an opening!\n\n` +
    `Date: ${formattedDate}\n` +
    `Time: ${formattedTime}\n` +
    `Party: ${partySize}\n\n` +
    `Reply "YES ${alertId.slice(0, 6)}" to book, or "NO ${alertId.slice(0, 6)}" to skip.`
  );
}

function formatTime(dateTimeStr: string): string {
  // Handle both "2024-01-15T19:30" and "19:30" formats
  const timePart = dateTimeStr.includes("T")
    ? dateTimeStr.split("T")[1]
    : dateTimeStr;
  const [hours, minutes] = timePart.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function validateTwilioRequest(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = getSetting("twilio_auth_token");
  if (!authToken) return false;

  return twilio.validateRequest(authToken, signature, url, params);
}
