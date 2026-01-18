import { describe, it, expect } from 'vitest';
import {
  kgToLbs,
  lbsToKg,
  gToOz,
  mlToFlOz,
  formatWeight,
  convertIngredientUnit,
  formatIngredientWithConversion,
} from '../unit-utils';

describe('unit-utils', () => {
  describe('kgToLbs', () => {
    it('converts kilograms to pounds', () => {
      expect(kgToLbs(1)).toBeCloseTo(2.205, 2);
      expect(kgToLbs(16)).toBeCloseTo(35.27, 1);
    });

    it('handles zero', () => {
      expect(kgToLbs(0)).toBe(0);
    });

    it('handles fractional values', () => {
      expect(kgToLbs(0.5)).toBeCloseTo(1.1, 1);
    });
  });

  describe('lbsToKg', () => {
    it('converts pounds to kilograms', () => {
      expect(lbsToKg(2.205)).toBeCloseTo(1, 1);
      expect(lbsToKg(45)).toBeCloseTo(20.4, 1);
    });

    it('handles zero', () => {
      expect(lbsToKg(0)).toBe(0);
    });
  });

  describe('gToOz', () => {
    it('converts grams to ounces', () => {
      expect(gToOz(100)).toBeCloseTo(3.53, 1);
      expect(gToOz(28.35)).toBeCloseTo(1, 1);
    });

    it('handles zero', () => {
      expect(gToOz(0)).toBe(0);
    });
  });

  describe('mlToFlOz', () => {
    it('converts milliliters to fluid ounces', () => {
      expect(mlToFlOz(100)).toBeCloseTo(3.38, 1);
      expect(mlToFlOz(29.57)).toBeCloseTo(1, 1);
    });

    it('handles zero', () => {
      expect(mlToFlOz(0)).toBe(0);
    });
  });

  describe('formatWeight', () => {
    it('formats weight in metric system', () => {
      expect(formatWeight(16, 'kg', 'metric')).toBe('16 kg');
      expect(formatWeight(200, 'g', 'metric')).toBe('200 g');
    });

    it('converts and formats weight in imperial system', () => {
      expect(formatWeight(16, 'kg', 'imperial')).toBe('35 lbs');
      expect(formatWeight(100, 'g', 'imperial')).toBe('4 oz');
    });

    it('handles zero values', () => {
      expect(formatWeight(0, 'kg', 'metric')).toBe('0 kg');
      expect(formatWeight(0, 'kg', 'imperial')).toBe('0 lbs');
    });
  });

  describe('convertIngredientUnit', () => {
    describe('unit-agnostic ingredients', () => {
      it('returns unchanged for piece-like units', () => {
        expect(convertIngredientUnit(2, 'cloves', 'imperial')).toEqual({
          quantity: 2,
          unit: 'cloves',
        });
        expect(convertIngredientUnit(1, 'pinch', 'metric')).toEqual({
          quantity: 1,
          unit: 'pinch',
        });
        expect(convertIngredientUnit(3, 'pieces', 'imperial')).toEqual({
          quantity: 3,
          unit: 'pieces',
        });
      });

      it('handles empty unit', () => {
        expect(convertIngredientUnit(1, '', 'metric')).toEqual({
          quantity: 1,
          unit: '',
        });
      });
    });

    describe('metric to imperial conversion', () => {
      it('converts grams to ounces', () => {
        const result = convertIngredientUnit(100, 'g', 'imperial');
        expect(result.quantity).toBe(3.5);
        expect(result.unit).toBe('oz');
      });

      it('converts milliliters to fluid ounces', () => {
        const result = convertIngredientUnit(250, 'ml', 'imperial');
        expect(result.quantity).toBe(8.5);
        expect(result.unit).toBe('fl oz');
      });

      it('converts kilograms to pounds', () => {
        const result = convertIngredientUnit(1, 'kg', 'imperial');
        expect(result.quantity).toBe(2.2);
        expect(result.unit).toBe('lbs');
      });

      it('converts liters to cups', () => {
        const result = convertIngredientUnit(1, 'l', 'imperial');
        expect(result.quantity).toBe(4.2);
        expect(result.unit).toBe('cups');
      });
    });

    describe('imperial to metric conversion', () => {
      it('converts ounces to grams', () => {
        const result = convertIngredientUnit(4, 'oz', 'metric');
        expect(result.quantity).toBe(113);
        expect(result.unit).toBe('g');
      });

      it('converts fluid ounces to milliliters', () => {
        const result = convertIngredientUnit(8, 'fl oz', 'metric');
        expect(result.quantity).toBe(237);
        expect(result.unit).toBe('ml');
      });

      it('converts pounds to kilograms', () => {
        const result = convertIngredientUnit(2.2, 'lbs', 'metric');
        expect(result.quantity).toBe(1);
        expect(result.unit).toBe('kg');
      });

      it('converts lb to kilograms (singular form)', () => {
        const result = convertIngredientUnit(2.2, 'lb', 'metric');
        expect(result.quantity).toBe(1);
        expect(result.unit).toBe('kg');
      });

      it('converts cups to milliliters', () => {
        const result = convertIngredientUnit(1, 'cups', 'metric');
        expect(result.quantity).toBe(237);
        expect(result.unit).toBe('ml');
      });

      it('converts cup to milliliters (singular form)', () => {
        const result = convertIngredientUnit(1, 'cup', 'metric');
        expect(result.quantity).toBe(237);
        expect(result.unit).toBe('ml');
      });

      it('converts tablespoons to milliliters', () => {
        const result = convertIngredientUnit(2, 'tbsp', 'metric');
        expect(result.quantity).toBe(30);
        expect(result.unit).toBe('ml');
      });

      it('converts teaspoons to milliliters', () => {
        const result = convertIngredientUnit(1, 'tsp', 'metric');
        expect(result.quantity).toBe(5);
        expect(result.unit).toBe('ml');
      });
    });

    describe('same system - no conversion', () => {
      it('returns metric unchanged when target is metric', () => {
        expect(convertIngredientUnit(100, 'g', 'metric')).toEqual({
          quantity: 100,
          unit: 'g',
        });
        expect(convertIngredientUnit(250, 'ml', 'metric')).toEqual({
          quantity: 250,
          unit: 'ml',
        });
      });

      it('returns imperial unchanged when target is imperial', () => {
        expect(convertIngredientUnit(4, 'oz', 'imperial')).toEqual({
          quantity: 4,
          unit: 'oz',
        });
        expect(convertIngredientUnit(2, 'cups', 'imperial')).toEqual({
          quantity: 2,
          unit: 'cups',
        });
      });

      it('returns cup unchanged when target is imperial (singular form)', () => {
        expect(convertIngredientUnit(1, 'cup', 'imperial')).toEqual({
          quantity: 1,
          unit: 'cup',
        });
      });
    });

    describe('case insensitivity', () => {
      it('handles uppercase units', () => {
        expect(convertIngredientUnit(100, 'G', 'imperial')).toEqual({
          quantity: 3.5,
          unit: 'oz',
        });
        expect(convertIngredientUnit(4, 'OZ', 'metric')).toEqual({
          quantity: 113,
          unit: 'g',
        });
      });

      it('handles mixed case units', () => {
        expect(convertIngredientUnit(250, 'ML', 'imperial')).toEqual({
          quantity: 8.5,
          unit: 'fl oz',
        });
      });
    });

    describe('edge cases', () => {
      it('handles zero quantity', () => {
        expect(convertIngredientUnit(0, 'g', 'imperial')).toEqual({
          quantity: 0,
          unit: 'oz',
        });
      });

      it('handles whitespace in unit', () => {
        expect(convertIngredientUnit(100, ' g ', 'imperial')).toEqual({
          quantity: 3.5,
          unit: 'oz',
        });
      });
    });
  });

  describe('formatIngredientWithConversion', () => {
    describe('without conversion display', () => {
      it('returns only converted value when showConversion is false', () => {
        expect(formatIngredientWithConversion(500, 'ml', 'metric', false)).toBe('500 ml');
        expect(formatIngredientWithConversion(500, 'ml', 'imperial', false)).toBe('16.9 fl oz');
      });

      it('handles unit-agnostic ingredients', () => {
        expect(formatIngredientWithConversion(2, 'cloves', 'metric', false)).toBe('2 cloves');
        expect(formatIngredientWithConversion(3, 'pieces', 'imperial', false)).toBe('3 pieces');
      });
    });

    describe('with conversion display', () => {
      it('shows both metric and imperial when showConversion is true (metric primary)', () => {
        const result = formatIngredientWithConversion(500, 'ml', 'metric', true);
        expect(result).toBe('500 ml (16.9 fl oz)');
      });

      it('shows both imperial and metric when showConversion is true (imperial primary)', () => {
        const result = formatIngredientWithConversion(2, 'cups', 'imperial', true);
        expect(result).toBe('2 cups (473 ml)');
      });

      it('shows grams with ounce conversion', () => {
        const result = formatIngredientWithConversion(100, 'g', 'metric', true);
        expect(result).toBe('100 g (3.5 oz)');
      });

      it('shows ounces with gram conversion', () => {
        const result = formatIngredientWithConversion(4, 'oz', 'imperial', true);
        expect(result).toBe('4 oz (113 g)');
      });

      it('shows kilograms with pound conversion', () => {
        const result = formatIngredientWithConversion(1, 'kg', 'metric', true);
        expect(result).toBe('1 kg (2.2 lbs)');
      });

      it('shows pounds with kilogram conversion', () => {
        const result = formatIngredientWithConversion(2.2, 'lbs', 'imperial', true);
        expect(result).toBe('2.2 lbs (1 kg)');
      });

      it('shows liters with cup conversion', () => {
        const result = formatIngredientWithConversion(1, 'l', 'metric', true);
        expect(result).toBe('1 l (4.2 cups)');
      });
    });

    describe('unit-agnostic with conversion enabled', () => {
      it('does not show conversion for piece-like units even when enabled', () => {
        expect(formatIngredientWithConversion(2, 'cloves', 'metric', true)).toBe('2 cloves');
        expect(formatIngredientWithConversion(1, 'pinch', 'imperial', true)).toBe('1 pinch');
        expect(formatIngredientWithConversion(3, 'pieces', 'metric', true)).toBe('3 pieces');
      });

      it('does not show conversion for empty unit', () => {
        expect(formatIngredientWithConversion(1, '', 'metric', true)).toBe('1 ');
      });
    });

    describe('edge cases', () => {
      it('handles zero quantity', () => {
        expect(formatIngredientWithConversion(0, 'g', 'metric', true)).toBe('0 g (0 oz)');
      });

      it('handles case-insensitive units (preserves original case for same-system)', () => {
        // When unit is already in target system, case is preserved
        expect(formatIngredientWithConversion(100, 'G', 'metric', true)).toBe('100 G (3.5 oz)');
        expect(formatIngredientWithConversion(100, 'ML', 'metric', true)).toBe('100 ML (3.4 fl oz)');
      });
    });
  });
});
