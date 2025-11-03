"use client";

import { useRef, useTransition } from "react";
import type { DaySlug } from "@/lib/workouts";

type Option = {
  value: string;
  label: string;
};

type DayAssignmentSelectProps = {
  assetId: number;
  currentDay: DaySlug | null;
  defaultDay: DaySlug | null;
  options: Option[];
  action: (formData: FormData) => Promise<void>;
};

export function DayAssignmentSelect({
  assetId,
  currentDay,
  defaultDay,
  options,
  action,
}: DayAssignmentSelectProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="currentDay" value={currentDay ?? ""} />
      <select
        name="day"
        defaultValue={defaultDay ?? "none"}
        disabled={pending}
        onChange={(event) => {
          const form = event.currentTarget.form;
          const submitter = submitRef.current ?? undefined;
          if (form) {
            startTransition(() => {
              form.requestSubmit(submitter);
            });
          }
        }}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none sm:max-w-xs"
      >
        <option value="none">Unassigned</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button ref={submitRef} type="submit" className="hidden">
        save
      </button>
    </form>
  );
}
