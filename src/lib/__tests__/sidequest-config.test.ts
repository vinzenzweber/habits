/**
 * Tests for SideQuest configuration module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the sidequest module before importing
vi.mock("sidequest", () => ({
  Sidequest: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  },
}));

// Store original env
const originalEnv = { ...process.env };

describe("sidequest-config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe("initializeSidequest", () => {
    it("throws error when no database URL is set", async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DATABASE_PUBLIC_URL;

      const { initializeSidequest } = await import("../sidequest-config");

      await expect(initializeSidequest()).rejects.toThrow(
        "DATABASE_URL (or DATABASE_PUBLIC_URL) must be set to use SideQuest."
      );
    });

    it("initializes with DATABASE_URL", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledTimes(1);
      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: {
            driver: "@sidequest/postgres-backend",
            config: expect.objectContaining({
              connection: expect.objectContaining({
                connectionString: "postgres://localhost/test",
              }),
            }),
          },
        })
      );
    });

    it("falls back to DATABASE_PUBLIC_URL when DATABASE_URL is not set", async () => {
      delete process.env.DATABASE_URL;
      process.env.DATABASE_PUBLIC_URL = "postgres://public/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: {
            driver: "@sidequest/postgres-backend",
            config: expect.objectContaining({
              connection: expect.objectContaining({
                connectionString: "postgres://public/test",
              }),
            }),
          },
        })
      );
    });

    it("configures SSL for Railway deployments with railway.app domain", async () => {
      process.env.DATABASE_URL =
        "postgres://user:pass@railway.app:5432/habits";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: {
            driver: "@sidequest/postgres-backend",
            config: expect.objectContaining({
              connection: expect.objectContaining({
                ssl: { rejectUnauthorized: false },
              }),
            }),
          },
        })
      );
    });

    it("configures SSL for Railway deployments with railway.internal domain", async () => {
      process.env.DATABASE_URL =
        "postgres://user:pass@railway.internal:5432/habits";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: {
            driver: "@sidequest/postgres-backend",
            config: expect.objectContaining({
              connection: expect.objectContaining({
                ssl: { rejectUnauthorized: false },
              }),
            }),
          },
        })
      );
    });

    it("does not configure SSL for non-Railway deployments", async () => {
      process.env.DATABASE_URL = "postgres://localhost:5432/habits";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: {
            driver: "@sidequest/postgres-backend",
            config: expect.objectContaining({
              connection: expect.objectContaining({
                ssl: undefined,
              }),
            }),
          },
        })
      );
    });

    it("configures three queues with correct settings", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          queues: [
            { name: "pdf-processing", concurrency: 1, priority: 100 },
            { name: "recipe-extraction", concurrency: 3, priority: 50 },
            { name: "default", concurrency: 2, priority: 10 },
          ],
        })
      );
    });

    it("sets maxConcurrentJobs to 10", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          maxConcurrentJobs: 10,
        })
      );
    });

    it("disables dashboard", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          dashboard: { enabled: false },
        })
      );
    });

    it("enables manual job resolution with jobs file path", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          manualJobResolution: true,
          jobsFilePath: "./sidequest.jobs.ts",
        })
      );
    });

    it("uses JSON logger in production", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      process.env.NODE_ENV = "production";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: { level: "info", json: true },
        })
      );
    });

    it("does not configure logger in development", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      process.env.NODE_ENV = "development";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: undefined,
        })
      );
    });

    it("only initializes once (singleton pattern)", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest } = await import("../sidequest-config");

      await initializeSidequest();
      await initializeSidequest();
      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("shutdownSidequest", () => {
    it("stops Sidequest when initialized", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest, shutdownSidequest } = await import(
        "../sidequest-config"
      );

      await initializeSidequest();
      await shutdownSidequest();

      expect(Sidequest.stop).toHaveBeenCalledTimes(1);
    });

    it("does nothing when not initialized", async () => {
      const { Sidequest } = await import("sidequest");
      const { shutdownSidequest } = await import("../sidequest-config");

      await shutdownSidequest();

      expect(Sidequest.stop).not.toHaveBeenCalled();
    });

    it("allows re-initialization after shutdown", async () => {
      process.env.DATABASE_URL = "postgres://localhost/test";
      const { Sidequest } = await import("sidequest");
      const { initializeSidequest, shutdownSidequest } = await import(
        "../sidequest-config"
      );

      await initializeSidequest();
      await shutdownSidequest();
      await initializeSidequest();

      expect(Sidequest.start).toHaveBeenCalledTimes(2);
    });
  });
});
