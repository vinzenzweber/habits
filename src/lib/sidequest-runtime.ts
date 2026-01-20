import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backendFactory = require("@sidequest/backend") as {
  createBackendFromDriver: (config: { driver: string; config: unknown }) => Promise<unknown>;
};
const PostgresBackend = require("@sidequest/postgres-backend").default as new (
  config: unknown
) => unknown;

const sidequest = require("sidequest") as {
  Sidequest: typeof import("sidequest").Sidequest;
  Job: typeof import("sidequest").Job;
};

const originalCreateBackend = backendFactory.createBackendFromDriver.bind(backendFactory);
backendFactory.createBackendFromDriver = async (config) => {
  if (config.driver === "@sidequest/postgres-backend") {
    return new PostgresBackend(config.config);
  }
  return originalCreateBackend(config);
};

export const { Sidequest, Job } = sidequest;
