import { pollAllMonitors } from "./poller";

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let lastPollTime: Date | null = null;
let lastPollResult: Awaited<ReturnType<typeof pollAllMonitors>> | null = null;

export function startScheduler(): void {
  if (intervalId) return;

  console.log("[Scheduler] Starting poll scheduler (every 15 minutes)");

  // Run immediately on start
  runPoll();

  intervalId = setInterval(runPoll, POLL_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Stopped poll scheduler");
  }
}

export function getSchedulerStatus(): {
  running: boolean;
  lastPollTime: string | null;
  lastPollResult: Awaited<ReturnType<typeof pollAllMonitors>> | null;
  nextPollTime: string | null;
} {
  return {
    running: !!intervalId,
    lastPollTime: lastPollTime?.toISOString() ?? null,
    lastPollResult,
    nextPollTime: lastPollTime
      ? new Date(lastPollTime.getTime() + POLL_INTERVAL_MS).toISOString()
      : null,
  };
}

async function runPoll(): Promise<void> {
  if (isRunning) {
    console.log("[Scheduler] Poll already in progress, skipping");
    return;
  }

  isRunning = true;
  console.log("[Scheduler] Running poll cycle...");

  try {
    lastPollResult = await pollAllMonitors();
    lastPollTime = new Date();
    console.log(
      `[Scheduler] Poll complete: ${lastPollResult.monitorsChecked} monitors, ${lastPollResult.slotsFound} slots, ${lastPollResult.alertsSent} alerts`
    );
  } catch (err) {
    console.error("[Scheduler] Poll error:", err);
    lastPollTime = new Date();
    lastPollResult = {
      monitorsChecked: 0,
      slotsFound: 0,
      alertsSent: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  } finally {
    isRunning = false;
  }
}
