import { v4 as uuidv4 } from "uuid";
import {
  getActiveMonitors,
  getAlertBySlot,
  createAlert,
  logPoll,
  getSetting,
} from "./db";
import { checkAvailability } from "./opentable";
import { sendSMS, formatAlertMessage } from "./twilio";

export async function pollAllMonitors(): Promise<{
  monitorsChecked: number;
  slotsFound: number;
  alertsSent: number;
  errors: string[];
}> {
  const monitors = getActiveMonitors();
  let totalSlots = 0;
  let totalAlerts = 0;
  const errors: string[] = [];

  for (const monitor of monitors) {
    try {
      const result = await pollMonitor(monitor.id, monitor.restaurant_id, monitor.restaurant_name, monitor.party_size, monitor.target_days, monitor.target_time_start, monitor.target_time_end, monitor.weeks_ahead);
      totalSlots += result.slotsFound;
      totalAlerts += result.alertsSent;
      logPoll(monitor.id, result.slotsFound);
    } catch (err) {
      const errorMsg = `Monitor ${monitor.id} (${monitor.restaurant_name}): ${err instanceof Error ? err.message : String(err)}`;
      errors.push(errorMsg);
      logPoll(monitor.id, 0, errorMsg);
    }
  }

  return {
    monitorsChecked: monitors.length,
    slotsFound: totalSlots,
    alertsSent: totalAlerts,
    errors,
  };
}

async function pollMonitor(
  monitorId: string,
  restaurantId: string,
  restaurantName: string,
  partySize: number,
  targetDaysJson: string,
  targetTimeStart: string,
  targetTimeEnd: string,
  weeksAhead: number
): Promise<{ slotsFound: number; alertsSent: number }> {
  const targetDays: number[] = JSON.parse(targetDaysJson);
  const datesToCheck = generateDates(targetDays, weeksAhead);

  let slotsFound = 0;
  let alertsSent = 0;

  for (const date of datesToCheck) {
    // Format as YYYY-MM-DDTHH:MM using the midpoint of the time window
    const midTime = getMidTime(targetTimeStart, targetTimeEnd);
    const dateTime = `${date}T${midTime}`;

    try {
      const slots = await checkAvailability(restaurantId, dateTime, partySize);

      // Filter slots within the target time range
      const matchingSlots = slots.filter((slot) => {
        const slotTime = slot.dateTime.split("T")[1]?.slice(0, 5) ?? "";
        return slotTime >= targetTimeStart && slotTime <= targetTimeEnd;
      });

      slotsFound += matchingSlots.length;

      // Send alerts for new slots
      for (const slot of matchingSlots) {
        const existing = getAlertBySlot(monitorId, date, slot.dateTime);
        if (existing) continue;

        const alertId = uuidv4();
        const alert = createAlert({
          id: alertId,
          monitor_id: monitorId,
          restaurant_name: restaurantName,
          date,
          time_slot: slot.dateTime,
          slot_hash: slot.slotHash,
          slot_token: slot.slotToken,
          status: "pending",
          twilio_message_sid: null,
          booking_confirmation: null,
        });

        // Send SMS
        try {
          const twilioConfigured = getSetting("twilio_account_sid") && getSetting("twilio_phone_number") && getSetting("user_phone_number");
          if (twilioConfigured) {
            const message = formatAlertMessage(
              restaurantName,
              date,
              slot.dateTime,
              partySize,
              alertId
            );
            const sid = await sendSMS(message);
            // Update alert with Twilio SID
            const db = await import("./db");
            db.updateAlertStatus(alert.id, "pending", { twilio_message_sid: sid });
            alertsSent++;
          }
        } catch (smsErr) {
          console.error(`Failed to send SMS for alert ${alertId}:`, smsErr);
        }
      }

      // Small delay between API calls to be respectful
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error checking ${restaurantName} on ${date}:`, err);
    }
  }

  return { slotsFound, alertsSent };
}

function generateDates(targetDays: number[], weeksAhead: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let week = 0; week < weeksAhead; week++) {
    for (const dayOfWeek of targetDays) {
      const date = new Date(today);
      // Get the next occurrence of this day of week
      const currentDay = today.getDay();
      let daysUntil = dayOfWeek - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      daysUntil += week * 7;

      // Skip past dates
      if (daysUntil < 0) continue;

      date.setDate(today.getDate() + daysUntil);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
  }

  return [...new Set(dates)].sort();
}

function getMidTime(start: string, end: string): string {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const midMinutes = Math.floor((startMinutes + endMinutes) / 2);
  const h = Math.floor(midMinutes / 60);
  const m = midMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
