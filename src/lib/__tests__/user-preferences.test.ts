import { describe, it, expect } from "vitest";
import {
  isValidTimezone,
  isValidLocale,
  isValidUnitSystem,
  isValidUserPreferences,
  getDefaultUnitSystemForLocale,
  COMMON_TIMEZONES,
  SUPPORTED_LOCALES,
  UNIT_SYSTEMS,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from "../user-preferences";

describe("User Preferences", () => {
  describe("Constants", () => {
    describe("COMMON_TIMEZONES", () => {
      it("contains expected timezones", () => {
        expect(COMMON_TIMEZONES.length).toBeGreaterThan(0);
        expect(COMMON_TIMEZONES.some(tz => tz.value === "UTC")).toBe(true);
        expect(COMMON_TIMEZONES.some(tz => tz.value === "America/New_York")).toBe(true);
        expect(COMMON_TIMEZONES.some(tz => tz.value === "Europe/Berlin")).toBe(true);
      });

      it("has unique values", () => {
        const values = COMMON_TIMEZONES.map(tz => tz.value);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
      });

      it("has label and value for each entry", () => {
        COMMON_TIMEZONES.forEach(tz => {
          expect(typeof tz.value).toBe("string");
          expect(typeof tz.label).toBe("string");
          expect(tz.value.length).toBeGreaterThan(0);
          expect(tz.label.length).toBeGreaterThan(0);
        });
      });
    });

    describe("SUPPORTED_LOCALES", () => {
      it("contains expected locales", () => {
        expect(SUPPORTED_LOCALES.length).toBeGreaterThan(0);
        expect(SUPPORTED_LOCALES.some(l => l.value === "en-US")).toBe(true);
        expect(SUPPORTED_LOCALES.some(l => l.value === "de-DE")).toBe(true);
      });

      it("has unique values", () => {
        const values = SUPPORTED_LOCALES.map(l => l.value);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
      });

      it("has valid BCP 47 format values", () => {
        SUPPORTED_LOCALES.forEach(l => {
          expect(isValidLocale(l.value)).toBe(true);
        });
      });
    });

    describe("UNIT_SYSTEMS", () => {
      it("contains metric and imperial", () => {
        expect(UNIT_SYSTEMS.length).toBe(2);
        expect(UNIT_SYSTEMS.some(us => us.value === "metric")).toBe(true);
        expect(UNIT_SYSTEMS.some(us => us.value === "imperial")).toBe(true);
      });

      it("has descriptive labels", () => {
        UNIT_SYSTEMS.forEach(us => {
          expect(us.label.length).toBeGreaterThan(0);
          // Labels should mention units
          expect(us.label).toMatch(/kg|lbs|cm|in/i);
        });
      });
    });

    describe("DEFAULT_PREFERENCES", () => {
      it("has valid default values", () => {
        expect(DEFAULT_PREFERENCES.timezone).toBe("UTC");
        expect(DEFAULT_PREFERENCES.locale).toBe("en-US");
        expect(DEFAULT_PREFERENCES.unitSystem).toBe("metric");
        expect(isValidUserPreferences(DEFAULT_PREFERENCES)).toBe(true);
      });
    });
  });

  describe("isValidTimezone", () => {
    it("returns true for valid IANA timezones", () => {
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/Berlin")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("returns false for invalid timezones", () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("foo")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidTimezone(null as unknown as string)).toBe(false);
      expect(isValidTimezone(undefined as unknown as string)).toBe(false);
      expect(isValidTimezone(123 as unknown as string)).toBe(false);
    });
  });

  describe("isValidLocale", () => {
    it("returns true for valid BCP 47 locales", () => {
      expect(isValidLocale("en-US")).toBe(true);
      expect(isValidLocale("de-DE")).toBe(true);
      expect(isValidLocale("fr-FR")).toBe(true);
      expect(isValidLocale("ja-JP")).toBe(true);
    });

    it("returns true for language-only codes", () => {
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("de")).toBe(true);
      expect(isValidLocale("zh")).toBe(true);
    });

    it("returns false for invalid locales", () => {
      expect(isValidLocale("")).toBe(false);
      expect(isValidLocale("invalid")).toBe(false);
      expect(isValidLocale("en-USA")).toBe(false); // Region should be 2 chars
      expect(isValidLocale("e-US")).toBe(false); // Language should be 2-3 chars
    });

    it("returns false for non-string values", () => {
      expect(isValidLocale(null as unknown as string)).toBe(false);
      expect(isValidLocale(undefined as unknown as string)).toBe(false);
    });
  });

  describe("isValidUnitSystem", () => {
    it("returns true for metric and imperial", () => {
      expect(isValidUnitSystem("metric")).toBe(true);
      expect(isValidUnitSystem("imperial")).toBe(true);
    });

    it("returns false for invalid values", () => {
      expect(isValidUnitSystem("")).toBe(false);
      expect(isValidUnitSystem("other")).toBe(false);
      expect(isValidUnitSystem("METRIC")).toBe(false); // Case sensitive
    });
  });

  describe("isValidUserPreferences", () => {
    it("returns true for valid preferences", () => {
      const valid: UserPreferences = {
        timezone: "UTC",
        locale: "en-US",
        unitSystem: "metric",
      };
      expect(isValidUserPreferences(valid)).toBe(true);
    });

    it("returns true for various valid combinations", () => {
      expect(isValidUserPreferences({
        timezone: "America/New_York",
        locale: "en-US",
        unitSystem: "imperial",
      })).toBe(true);

      expect(isValidUserPreferences({
        timezone: "Europe/Berlin",
        locale: "de-DE",
        unitSystem: "metric",
      })).toBe(true);
    });

    it("returns false for invalid timezone", () => {
      expect(isValidUserPreferences({
        timezone: "Invalid/Zone",
        locale: "en-US",
        unitSystem: "metric",
      })).toBe(false);
    });

    it("returns false for invalid locale", () => {
      expect(isValidUserPreferences({
        timezone: "UTC",
        locale: "invalid",
        unitSystem: "metric",
      })).toBe(false);
    });

    it("returns false for invalid unit system", () => {
      expect(isValidUserPreferences({
        timezone: "UTC",
        locale: "en-US",
        unitSystem: "other" as unknown as "metric",
      })).toBe(false);
    });

    it("returns false for non-object values", () => {
      expect(isValidUserPreferences(null)).toBe(false);
      expect(isValidUserPreferences(undefined)).toBe(false);
      expect(isValidUserPreferences("string")).toBe(false);
      expect(isValidUserPreferences(123)).toBe(false);
    });

    it("returns false for missing fields", () => {
      expect(isValidUserPreferences({
        timezone: "UTC",
        locale: "en-US",
      })).toBe(false);

      expect(isValidUserPreferences({
        timezone: "UTC",
        unitSystem: "metric",
      })).toBe(false);
    });
  });

  describe("getDefaultUnitSystemForLocale", () => {
    it("returns imperial for US locale", () => {
      expect(getDefaultUnitSystemForLocale("en-US")).toBe("imperial");
    });

    it("returns imperial for UK locale", () => {
      expect(getDefaultUnitSystemForLocale("en-GB")).toBe("imperial");
    });

    it("returns metric for German locale", () => {
      expect(getDefaultUnitSystemForLocale("de-DE")).toBe("metric");
    });

    it("returns metric for French locale", () => {
      expect(getDefaultUnitSystemForLocale("fr-FR")).toBe("metric");
    });

    it("returns metric for Japanese locale", () => {
      expect(getDefaultUnitSystemForLocale("ja-JP")).toBe("metric");
    });

    it("returns metric for unknown locales", () => {
      expect(getDefaultUnitSystemForLocale("unknown")).toBe("metric");
      expect(getDefaultUnitSystemForLocale("")).toBe("metric");
    });
  });
});
