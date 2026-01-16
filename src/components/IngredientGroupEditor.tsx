'use client';

import { useCallback } from 'react';
import type { IngredientGroup, Ingredient } from '@/lib/recipe-types';

interface IngredientGroupEditorProps {
  groups: IngredientGroup[];
  onChange: (groups: IngredientGroup[]) => void;
  disabled?: boolean;
}

export function IngredientGroupEditor({
  groups,
  onChange,
  disabled = false,
}: IngredientGroupEditorProps) {
  const addGroup = useCallback(() => {
    onChange([
      ...groups,
      { name: '', ingredients: [{ name: '', quantity: 0, unit: '' }] },
    ]);
  }, [groups, onChange]);

  const removeGroup = useCallback((groupIndex: number) => {
    onChange(groups.filter((_, i) => i !== groupIndex));
  }, [groups, onChange]);

  const updateGroupName = useCallback((groupIndex: number, name: string) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], name };
    onChange(newGroups);
  }, [groups, onChange]);

  const addIngredient = useCallback((groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      ingredients: [
        ...newGroups[groupIndex].ingredients,
        { name: '', quantity: 0, unit: '' },
      ],
    };
    onChange(newGroups);
  }, [groups, onChange]);

  const removeIngredient = useCallback((groupIndex: number, ingredientIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      ingredients: newGroups[groupIndex].ingredients.filter((_, i) => i !== ingredientIndex),
    };
    // Remove group if no ingredients left
    if (newGroups[groupIndex].ingredients.length === 0) {
      onChange(newGroups.filter((_, i) => i !== groupIndex));
    } else {
      onChange(newGroups);
    }
  }, [groups, onChange]);

  const updateIngredient = useCallback(
    (groupIndex: number, ingredientIndex: number, updates: Partial<Ingredient>) => {
      const newGroups = [...groups];
      const ingredients = [...newGroups[groupIndex].ingredients];
      ingredients[ingredientIndex] = { ...ingredients[ingredientIndex], ...updates };
      newGroups[groupIndex] = { ...newGroups[groupIndex], ingredients };
      onChange(newGroups);
    },
    [groups, onChange]
  );

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
        >
          {/* Group header */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={group.name}
              onChange={(e) => updateGroupName(groupIndex, e.target.value)}
              placeholder="Group name (e.g., Dairy, Spices)"
              disabled={disabled}
              className="flex-1 p-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
            />
            {groups.length > 1 && (
              <button
                type="button"
                onClick={() => removeGroup(groupIndex)}
                disabled={disabled}
                className="p-2 text-slate-400 hover:text-red-400 transition disabled:opacity-50"
                title="Remove group"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            {group.ingredients.map((ingredient, ingredientIndex) => (
              <div key={ingredientIndex} className="flex items-center gap-2">
                {/* Quantity */}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingredient.quantity || ''}
                  onChange={(e) =>
                    updateIngredient(groupIndex, ingredientIndex, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Qty"
                  disabled={disabled}
                  className="w-20 p-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
                />

                {/* Unit */}
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) =>
                    updateIngredient(groupIndex, ingredientIndex, {
                      unit: e.target.value,
                    })
                  }
                  placeholder="Unit"
                  disabled={disabled}
                  className="w-24 p-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
                />

                {/* Name */}
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) =>
                    updateIngredient(groupIndex, ingredientIndex, {
                      name: e.target.value,
                    })
                  }
                  placeholder="Ingredient name"
                  disabled={disabled}
                  className="flex-1 p-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
                />

                {/* Remove button */}
                {group.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(groupIndex, ingredientIndex)}
                    disabled={disabled}
                    className="p-2 text-slate-400 hover:text-red-400 transition disabled:opacity-50"
                    title="Remove ingredient"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add ingredient button */}
          <button
            type="button"
            onClick={() => addIngredient(groupIndex)}
            disabled={disabled}
            className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition disabled:opacity-50"
          >
            + Add ingredient
          </button>
        </div>
      ))}

      {/* Add group button */}
      <button
        type="button"
        onClick={addGroup}
        disabled={disabled}
        className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-slate-600 hover:text-slate-300 transition disabled:opacity-50"
      >
        + Add ingredient group
      </button>
    </div>
  );
}
