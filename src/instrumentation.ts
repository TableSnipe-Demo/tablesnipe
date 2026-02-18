export async function register() {
  // Start the polling scheduler when the server starts
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
    console.log("[TableSnipe] Polling scheduler initialized");
  }
}
