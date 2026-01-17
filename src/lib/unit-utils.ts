/**
 * Unit conversion utilities for metric/imperial unit systems
 */

import type { UnitSystem } from './user-preferences';

// Conversion constants
const KG_TO_LBS = 2.20462;
const G_TO_OZ = 0.035274;
const ML_TO_FLOZ = 0.033814;
const L_TO_CUPS = 4.22675;
const ML_PER_CUP = 236.588;

// Weight conversions
export function kgToLbs(kg: number): number {
  return kg * KG_TO_LBS;
}

export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS;
}

// Volume conversions
export function mlToFlOz(ml: number): number {
  return ml * ML_TO_FLOZ;
}

export function gToOz(g: number): number {
  return g * G_TO_OZ;
}

// Format weight with appropriate unit
export function formatWeight(
  value: number,
  fromUnit: 'kg' | 'g',
  targetSystem: UnitSystem
): string {
  if (targetSystem === 'metric') {
    return fromUnit === 'kg' ? `${value} kg` : `${value} g`;
  }
  // Convert to imperial
  if (fromUnit === 'kg') {
    return `${Math.round(kgToLbs(value))} lbs`;
  }
  return `${Math.round(gToOz(value))} oz`;
}

// Known metric units
const METRIC_UNITS = ['g', 'ml', 'kg', 'l'];

// Known imperial units
const IMPERIAL_UNITS = ['oz', 'cups', 'tbsp', 'tsp', 'lb', 'lbs', 'fl oz'];

/**
 * Convert ingredient quantity and unit to user's preferred unit system
 * Returns the quantity and unit unchanged if:
 * - Unit is unit-agnostic (e.g., "pieces", "cloves")
 * - Unit is already in the target system
 */
export function convertIngredientUnit(
  quantity: number,
  unit: string,
  targetSystem: UnitSystem
): { quantity: number; unit: string } {
  const normalizedUnit = unit.toLowerCase().trim();

  const isMetric = METRIC_UNITS.includes(normalizedUnit);
  const isImperial = IMPERIAL_UNITS.includes(normalizedUnit);

  // If unit doesn't match either system (e.g., "pieces", "cloves"), return as-is
  if (!isMetric && !isImperial) {
    return { quantity, unit };
  }

  // If already in target system, return as-is
  if (
    (targetSystem === 'metric' && isMetric) ||
    (targetSystem === 'imperial' && isImperial)
  ) {
    return { quantity, unit };
  }

  // Convert metric to imperial
  if (targetSystem === 'imperial' && isMetric) {
    switch (normalizedUnit) {
      case 'g':
        return {
          quantity: Math.round(quantity * G_TO_OZ * 10) / 10,
          unit: 'oz',
        };
      case 'ml':
        return {
          quantity: Math.round(quantity * ML_TO_FLOZ * 10) / 10,
          unit: 'fl oz',
        };
      case 'kg':
        return {
          quantity: Math.round(quantity * KG_TO_LBS * 10) / 10,
          unit: 'lbs',
        };
      case 'l':
        return {
          quantity: Math.round(quantity * L_TO_CUPS * 10) / 10,
          unit: 'cups',
        };
      default:
        return { quantity, unit };
    }
  }

  // Convert imperial to metric
  if (targetSystem === 'metric' && isImperial) {
    switch (normalizedUnit) {
      case 'oz':
        return { quantity: Math.round(quantity / G_TO_OZ), unit: 'g' };
      case 'fl oz':
        return { quantity: Math.round(quantity / ML_TO_FLOZ), unit: 'ml' };
      case 'lb':
      case 'lbs':
        return {
          quantity: Math.round((quantity / KG_TO_LBS) * 10) / 10,
          unit: 'kg',
        };
      case 'cups':
        return { quantity: Math.round(quantity * ML_PER_CUP), unit: 'ml' };
      case 'tbsp':
        // 1 tbsp ≈ 15 ml
        return { quantity: Math.round(quantity * 15), unit: 'ml' };
      case 'tsp':
        // 1 tsp ≈ 5 ml
        return { quantity: Math.round(quantity * 5), unit: 'ml' };
      default:
        return { quantity, unit };
    }
  }

  return { quantity, unit };
}
