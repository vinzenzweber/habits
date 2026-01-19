export async function register() {
  // Only run on Node.js server runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initializeSidequest } = await import("@/lib/sidequest-config");
      await initializeSidequest();
    } catch (error) {
      console.error("[SideQuest] Failed to initialize:", error);
      // Don't throw - allow the app to continue without job processing
      // This allows the app to work even if SideQuest has issues
    }
  }
}
