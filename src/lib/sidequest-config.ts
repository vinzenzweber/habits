import path from "node:path";
import { Sidequest } from "@/lib/sidequest-runtime";
import type { Knex } from "knex";

let initialized = false;
let configured = false;

function shouldDisableSidequest(): boolean {
  return (
    process.env.CI === "true" || process.env.DISABLE_SIDEQUEST_WORKERS === "true"
  );
}

/**
 * Build database configuration with SSL settings for Railway deployments.
 */
function buildDatabaseConfig(connectionString: string): Knex.Config | string {
  const railwayEnv = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );

  try {
    const url = new URL(connectionString);
    const hostname = url.hostname.toLowerCase();
    const isRailwayHost =
      hostname.endsWith("railway.app") ||
      hostname.endsWith("railway.internal") ||
      hostname.endsWith("rlwy.net") ||
      hostname.includes("railway");
    const isRailway = railwayEnv || isRailwayHost;

    if (!isRailway) {
      return connectionString;
    }

    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return {
      client: "pg",
      connection: {
        connectionString: url.toString(),
        ssl: {
          rejectUnauthorized: false,
        },
      },
    } satisfies Knex.Config;
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

  if (shouldDisableSidequest()) {
    configured = true;
    return;
  }

  await Sidequest.configure(buildSidequestConfig());

  configured = true;
}

export async function initializeSidequest(): Promise<void> {
  if (initialized) {
    return;
  }

  if (shouldDisableSidequest()) {
    configured = true;
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
