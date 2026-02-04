'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface ExerciseItem {
  id: number;
  name: string;
  formCues: string | null;
  hasDescription: boolean;
  category: string | null;
  updatedAt: Date;
}

interface ExerciseDescriptionsManagerProps {
  initialExercises: ExerciseItem[];
}

export function ExerciseDescriptionsManager({
  initialExercises,
}: ExerciseDescriptionsManagerProps) {
  const t = useTranslations('exercises');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');

  const [exercises, setExercises] = useState(initialExercises);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with' | 'without'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState<number | null>(null);

  // Filter exercises based on search and status filter
  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      // Search filter
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'with' && exercise.hasDescription) ||
        (filterStatus === 'without' && !exercise.hasDescription);

      return matchesSearch && matchesStatus;
    });
  }, [exercises, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = exercises.length;
    const withDescription = exercises.filter(e => e.hasDescription).length;
    const withoutDescription = total - withDescription;
    return { total, withDescription, withoutDescription };
  }, [exercises]);

  const handleEdit = (exercise: ExerciseItem) => {
    setEditingId(exercise.id);
    setEditValue(exercise.formCues || '');
    setError('');
    setSuccessId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
    setError('');
  };

  const handleSave = async (exercise: ExerciseItem) => {
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/exercises/${encodeURIComponent(exercise.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formCues: editValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || tErrors('saveError'));
        return;
      }

      const updated = await response.json();

      // Update local state
      setExercises(prev =>
        prev.map(e =>
          e.id === exercise.id
            ? {
                ...e,
                formCues: updated.formCues,
                hasDescription: !!updated.formCues && updated.formCues.trim().length > 0,
                updatedAt: new Date(updated.updatedAt),
              }
            : e
        )
      );

      setEditingId(null);
      setEditValue('');
      setSuccessId(exercise.id);

      // Clear success indicator after 2 seconds
      setTimeout(() => setSuccessId(null), 2000);
    } catch {
      setError(tErrors('generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <section className="bg-slate-900 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-slate-400">{t('totalExercises')}:</span>{' '}
            <span className="text-slate-100 font-medium">{stats.total}</span>
          </div>
          <div>
            <span className="text-slate-400">{t('withDescription')}:</span>{' '}
            <span className="text-emerald-400 font-medium">{stats.withDescription}</span>
          </div>
          <div>
            <span className="text-slate-400">{t('withoutDescription')}:</span>{' '}
            <span className="text-amber-400 font-medium">{stats.withoutDescription}</span>
          </div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="bg-slate-900 rounded-lg p-4 space-y-3">
        <div>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded text-sm transition ${
              filterStatus === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('filterAll')} ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('with')}
            className={`px-3 py-1.5 rounded text-sm transition ${
              filterStatus === 'with'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('filterWithDescription')} ({stats.withDescription})
          </button>
          <button
            onClick={() => setFilterStatus('without')}
            className={`px-3 py-1.5 rounded text-sm transition ${
              filterStatus === 'without'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('filterWithoutDescription')} ({stats.withoutDescription})
          </button>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div role="alert" className="bg-red-500/20 text-red-200 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Exercise List */}
      <section className="bg-slate-900 rounded-lg divide-y divide-slate-800">
        {filteredExercises.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            {t('noExercisesFound')}
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <div key={exercise.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-100 truncate">
                      {exercise.name}
                    </h3>
                    {exercise.hasDescription ? (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                        {t('hasDescription')}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                        {t('missingDescription')}
                      </span>
                    )}
                    {successId === exercise.id && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                        {t('saved')}
                      </span>
                    )}
                  </div>
                  {exercise.category && (
                    <span className="text-xs text-slate-500 capitalize">
                      {exercise.category}
                    </span>
                  )}
                </div>

                {editingId !== exercise.id && (
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="flex-shrink-0 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
                  >
                    {tCommon('edit')}
                  </button>
                )}
              </div>

              {editingId === exercise.id ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    rows={3}
                    disabled={saving}
                    className="w-full p-3 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-slate-100 placeholder:text-slate-500 disabled:opacity-50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(exercise)}
                      disabled={saving}
                      className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition disabled:opacity-50"
                    >
                      {saving ? t('saving') : tCommon('save')}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition disabled:opacity-50"
                    >
                      {tCommon('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                exercise.formCues && (
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {exercise.formCues}
                  </p>
                )
              )}
            </div>
          ))
        )}
      </section>

      {/* Results count */}
      {filteredExercises.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          {t('showingCount', { count: filteredExercises.length, total: exercises.length })}
        </p>
      )}
    </div>
  );
}
