import path from "node:path";
import { Sidequest } from "@/lib/sidequest-runtime";
import type { Knex } from "knex";

let initialized = false;
let configured = false;

/**
 * Build database configuration with SSL settings for Railway deployments.
 */
function buildDatabaseConfig(connectionString: string): Knex.Config | string {
  const isRailway =
    connectionString.includes("railway.app") ||
    connectionString.includes("railway.internal");

  if (!isRailway) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

/**
 * Initialize SideQuest job processing engine.
 * This should be called once when the server starts via instrumentation.ts
 */
function buildSidequestConfig() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or DATABASE_PUBLIC_URL) must be set to use SideQuest."
    );
  }

  const isProduction = process.env.NODE_ENV === "production";

  const cwd =
    typeof process !== "undefined" && typeof process.cwd === "function"
      ? process.cwd()
      : ".";
  const jobsFilePath = path.resolve(cwd, "sidequest.jobs.cjs");

  return {
    backend: {
      driver: "@sidequest/postgres-backend",
      config: buildDatabaseConfig(connectionString),
    },
    queues: [
      {
        name: "pdf-processing",
        concurrency: 1,
        priority: 100,
      },
      {
        name: "recipe-extraction",
        concurrency: 10,
        priority: 50,
      },
      {
        name: "default",
        concurrency: 2,
        priority: 10,
      },
    ],
    maxConcurrentJobs: 10,
    manualJobResolution: true,
    jobsFilePath,
    logger: isProduction
      ? {
          level: "info",
          json: true,
        }
      : undefined,
    dashboard: {
      enabled: false,
    },
  };
}

export async function configureSidequest(): Promise<void> {
  if (configured) {
    return;
  }

  await Sidequest.configure(buildSidequestConfig());

  configured = true;
}

export async function initializeSidequest(): Promise<void> {
  if (initialized) {
    return;
  }

  if (process.env.CI === "true" || process.env.DISABLE_SIDEQUEST_WORKERS === "true") {
    await configureSidequest();
    console.log("[SideQuest] Workers disabled");
    return;
  }

  await Sidequest.start(buildSidequestConfig());

  initialized = true;
  configured = true;
  console.log("[SideQuest] Workers started");
}

/**
 * Gracefully shutdown SideQuest workers.
 */
export async function shutdownSidequest(): Promise<void> {
  if (initialized) {
    await Sidequest.stop();
    initialized = false;
    configured = false;
    console.log("[SideQuest] Workers stopped");
  }
}
