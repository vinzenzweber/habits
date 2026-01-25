'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { RecipeStep } from '@/lib/recipe-types';

interface StepsEditorProps {
  steps: RecipeStep[];
  onChange: (steps: RecipeStep[]) => void;
  disabled?: boolean;
}

export function StepsEditor({
  steps,
  onChange,
  disabled = false,
}: StepsEditorProps) {
  const t = useTranslations('recipeForm');

  const addStep = useCallback(() => {
    const nextNumber = steps.length + 1;
    onChange([...steps, { number: nextNumber, instruction: '' }]);
  }, [steps, onChange]);

  const removeStep = useCallback((index: number) => {
    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, number: i + 1 }));
    onChange(newSteps);
  }, [steps, onChange]);

  const updateStep = useCallback((index: number, instruction: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], instruction };
    onChange(newSteps);
  }, [steps, onChange]);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;
    const newSteps = [...steps];
    const [removed] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, removed);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, number: i + 1 }));
    onChange(renumbered);
  }, [steps, onChange]);

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          {/* Step number */}
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-sm">
            {step.number}
          </div>

          {/* Instruction textarea */}
          <div className="flex-1">
            <textarea
              value={step.instruction}
              onChange={(e) => updateStep(index, e.target.value)}
              placeholder={t('stepPlaceholder', { number: step.number })}
              disabled={disabled}
              rows={3}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none resize-none text-sm disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {/* Move up */}
            <button
              type="button"
              onClick={() => moveStep(index, index - 1)}
              disabled={disabled || index === 0}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('moveUp')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Move down */}
            <button
              type="button"
              onClick={() => moveStep(index, index + 1)}
              disabled={disabled || index === steps.length - 1}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('moveDown')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Remove */}
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(index)}
                disabled={disabled}
                className="p-1.5 text-slate-400 hover:text-red-400 transition disabled:opacity-50"
                title={t('removeStep')}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add step button */}
      <button
        type="button"
        onClick={addStep}
        disabled={disabled}
        className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-slate-600 hover:text-slate-300 transition disabled:opacity-50"
      >
        + {t('addStep')}
      </button>
    </div>
  );
}
