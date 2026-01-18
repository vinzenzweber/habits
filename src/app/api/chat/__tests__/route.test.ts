import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests for chat route prompt content.
 *
 * These tests verify that the AI prompts contain the expected guidance
 * for exercise selection behavior (issue #187).
 *
 * The prompts instruct the AI to use a "design-first" approach:
 * 1. Design ideal exercises for the specific workout
 * 2. Check for duplicates in the exercise library
 * 3. Create new exercises when they better serve the workout's purpose
 */

// Read the route file content for testing
const routeFilePath = path.join(__dirname, "..", "route.ts");
const routeFileContent = fs.readFileSync(routeFilePath, "utf-8");

describe("Chat Route - Exercise Selection Prompts", () => {
  describe("Exercise Library & Selection Guidelines", () => {
    it("includes the 'DESIGN FIRST' instruction", () => {
      expect(routeFileContent).toContain("**DESIGN FIRST**");
      expect(routeFileContent).toContain("Independently design the ideal exercises");
    });

    it("instructs warmup exercises to prepare muscles for main workout", () => {
      expect(routeFileContent).toContain(
        "Warmup exercises should specifically prepare the muscles used in the main workout"
      );
    });

    it("provides workout-type specific warmup examples", () => {
      // Push Day
      expect(routeFileContent).toContain("Push Day warmup");
      expect(routeFileContent).toContain("shoulder circles");
      expect(routeFileContent).toContain("chest openers");

      // Leg Day
      expect(routeFileContent).toContain("Leg Day warmup");
      expect(routeFileContent).toContain("hip circles");
      expect(routeFileContent).toContain("glute activation");

      // Pull Day
      expect(routeFileContent).toContain("Pull Day warmup");
      expect(routeFileContent).toContain("lat stretches");
      expect(routeFileContent).toContain("thoracic rotations");
    });

    it("includes 'CHECK FOR DUPLICATES' instruction", () => {
      expect(routeFileContent).toContain("**CHECK FOR DUPLICATES**");
      expect(routeFileContent).toContain(
        "Use search_exercises to check if your designed exercise already exists"
      );
    });

    it("includes personalization guidance", () => {
      expect(routeFileContent).toContain("**PERSONALIZATION**");
      expect(routeFileContent).toContain("Consider user context from memory");
      expect(routeFileContent).toContain("Equipment available");
      expect(routeFileContent).toContain("Physical limitations");
    });

    it("explicitly discourages being limited by existing library", () => {
      expect(routeFileContent).toContain(
        "Do NOT let the existing exercise library limit your creativity"
      );
      expect(routeFileContent).toContain(
        "The goal is contextually appropriate exercises, not reusing existing ones"
      );
    });
  });

  describe("Workout-Specific Warmup Examples section", () => {
    it("includes Push Day warmup examples", () => {
      expect(routeFileContent).toContain("**Push Day** (chest/shoulders/triceps)");
      expect(routeFileContent).toContain("Shoulder circles with arm raises");
      expect(routeFileContent).toContain("chest opener stretches");
      expect(routeFileContent).toContain("wrist mobility");
    });

    it("includes Pull Day warmup examples", () => {
      expect(routeFileContent).toContain("**Pull Day** (back/biceps)");
      expect(routeFileContent).toContain("Thoracic spine rotations");
      expect(routeFileContent).toContain("Cat-Cow");
      expect(routeFileContent).toContain("scapular squeezes");
    });

    it("includes Leg Day warmup examples", () => {
      expect(routeFileContent).toContain("**Leg Day** (quads/glutes/hamstrings)");
      expect(routeFileContent).toContain("Hip circles");
      expect(routeFileContent).toContain("ankle mobility rocks");
      expect(routeFileContent).toContain("glute bridges");
    });

    it("includes Full Body warmup examples", () => {
      expect(routeFileContent).toContain("**Full Body**");
      expect(routeFileContent).toContain("World's greatest stretch");
      expect(routeFileContent).toContain("inchworms");
    });

    it("clarifies examples are not requirements", () => {
      expect(routeFileContent).toContain(
        "These are examples, not requirements"
      );
    });
  });

  describe("search_exercises tool description", () => {
    it("positions search as duplicate-checking, not primary source", () => {
      expect(routeFileContent).toContain(
        "Check if a designed exercise already exists in the library"
      );
    });

    it("instructs to use AFTER determining ideal exercise", () => {
      expect(routeFileContent).toContain(
        "Use AFTER determining the ideal exercise for the workout"
      );
    });

    it("mentions duplicate avoidance", () => {
      expect(routeFileContent).toContain("Helps avoid duplicates");
    });
  });

  describe("create_exercise tool description", () => {
    it("encourages creating contextually appropriate exercises", () => {
      expect(routeFileContent).toContain(
        "Use for contextually appropriate exercises that don't exist yet"
      );
    });

    it("explicitly encourages creating exercises when needed", () => {
      expect(routeFileContent).toContain(
        "Don't hesitate to create exercises when they better serve the workout's purpose"
      );
    });

    it("mentions automatic image generation", () => {
      expect(routeFileContent).toContain(
        "New exercises automatically queue for AI image generation"
      );
    });
  });

  describe("Old problematic patterns are removed", () => {
    it("no longer instructs to 'prefer' existing exercises", () => {
      // The old prompt said "prefer these - they have images ready"
      expect(routeFileContent).not.toContain(
        "prefer these - they have images ready"
      );
    });

    it("no longer says to use create_exercise 'only when' no match found", () => {
      // The old prompt was restrictive: "Use when no suitable existing exercise is found via search"
      expect(routeFileContent).not.toContain(
        "Use when no suitable existing exercise is found via search"
      );
    });

    it("no longer says search is for finding exercises with images", () => {
      // Old: "Search the exercise library for existing exercises. Use this to find exercises with images already available"
      expect(routeFileContent).not.toContain(
        "Search the exercise library for existing exercises"
      );
    });
  });
});
