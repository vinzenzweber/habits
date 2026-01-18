'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { PredefinedTag, TagCategory, TagCategoryInfo } from '@/lib/predefined-tags';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Custom tag suggestions (user's existing tags) */
  suggestions?: string[];
  /** Predefined tags with category metadata */
  predefinedTags?: PredefinedTag[];
  /** Category metadata for grouping */
  categories?: Partial<Record<TagCategory, TagCategoryInfo>>;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

interface GroupedSuggestion {
  type: 'category-header' | 'predefined' | 'custom-header' | 'custom';
  id: string;
  label: string;
  category?: TagCategory;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  predefinedTags = [],
  categories = {},
  placeholder = 'Add tag...',
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build grouped suggestions list with category headers
  // Performance note: This computation runs on every render even when dropdown is hidden.
  // This is acceptable as the filter operation is O(n) on a small array and negligible overhead.
  const groupedSuggestions = useMemo(() => {
    const lowerInput = input.toLowerCase();
    const result: GroupedSuggestion[] = [];
    const selectedSet = new Set(tags);

    // Group predefined tags by category
    const categoryMap = new Map<TagCategory, PredefinedTag[]>();
    for (const tag of predefinedTags) {
      // Filter by input and exclude already selected
      if (
        tag.id.includes(lowerInput) ||
        tag.label.toLowerCase().includes(lowerInput) ||
        tag.labelEn.toLowerCase().includes(lowerInput)
      ) {
        if (!selectedSet.has(tag.id)) {
          const existing = categoryMap.get(tag.category) || [];
          existing.push(tag);
          categoryMap.set(tag.category, existing);
        }
      }
    }

    // Add predefined tags grouped by category
    const categoryOrder: TagCategory[] = ['meal', 'diet', 'cuisine', 'category', 'effort'];
    for (const category of categoryOrder) {
      const categoryTags = categoryMap.get(category);
      if (categoryTags && categoryTags.length > 0) {
        const categoryInfo = categories[category];
        result.push({
          type: 'category-header',
          id: `header-${category}`,
          label: categoryInfo?.label || category,
          category,
        });
        for (const tag of categoryTags) {
          result.push({
            type: 'predefined',
            id: tag.id,
            label: tag.label,
            category: tag.category,
          });
        }
      }
    }

    // Filter and add custom tags
    // Note: Tags are stored in lowercase, so we filter and display suggestions in lowercase
    // to provide consistent UX (what you see is what you get)
    const predefinedIds = new Set(predefinedTags.map(t => t.id));
    const customSuggestions = suggestions
      .map(s => s.toLowerCase())
      .filter(
        (s, index, arr) =>
          s.includes(lowerInput) &&
          !selectedSet.has(s) &&
          !predefinedIds.has(s) &&
          arr.indexOf(s) === index // dedupe after lowercase conversion
      );

    if (customSuggestions.length > 0) {
      result.push({
        type: 'custom-header',
        id: 'header-custom',
        label: 'Your tags',
      });
      for (const tag of customSuggestions) {
        result.push({
          type: 'custom',
          id: tag,
          label: tag,
        });
      }
    }

    return result;
  }, [suggestions, predefinedTags, categories, input, tags]);

  // Get only selectable items (not headers) for keyboard navigation
  const selectableItems = useMemo(
    () => groupedSuggestions.filter(s => s.type === 'predefined' || s.type === 'custom'),
    [groupedSuggestions]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onChange([...tags, trimmed]);
      setInput('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [tags, maxTags, onChange]);

  const removeTag = useCallback((index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectableItems[selectedIndex]) {
        addTag(selectableItems[selectedIndex].id);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < selectableItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [input, tags, selectableItems, selectedIndex, addTag, removeTag]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  }, []);

  const canAddMore = tags.length < maxTags;

  // Get category color class for tag display
  const getCategoryColor = (category?: TagCategory): string => {
    const colors: Record<TagCategory, string> = {
      meal: 'bg-blue-500/20 text-blue-400',
      diet: 'bg-green-500/20 text-green-400',
      cuisine: 'bg-orange-500/20 text-orange-400',
      category: 'bg-purple-500/20 text-purple-400',
      effort: 'bg-yellow-500/20 text-yellow-400',
    };
    return category ? colors[category] : 'bg-slate-700';
  };

  // Find the index in selectableItems for a given suggestion
  const getSelectableIndex = (suggestionId: string): number => {
    return selectableItems.findIndex(s => s.id === suggestionId);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`
          flex flex-wrap gap-2 p-3 rounded bg-slate-800 border border-slate-700
          focus-within:border-emerald-500 transition
          ${disabled ? 'opacity-50' : ''}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {tags.map((tag, index) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-sm"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {canAddMore && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[100px] bg-transparent outline-none text-sm disabled:cursor-not-allowed"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && groupedSuggestions.length > 0 && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-64 overflow-auto">
          {groupedSuggestions.map((suggestion) => {
            // Headers are not selectable
            if (suggestion.type === 'category-header' || suggestion.type === 'custom-header') {
              return (
                <div
                  key={suggestion.id}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-850 border-t border-slate-700 first:border-t-0"
                >
                  {suggestion.label}
                </div>
              );
            }

            // Selectable items
            const selectableIdx = getSelectableIndex(suggestion.id);
            const isSelected = selectableIdx === selectedIndex;

            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => addTag(suggestion.id)}
                className={`
                  w-full px-4 py-2 text-left text-sm transition flex items-center gap-2
                  ${isSelected
                    ? 'bg-slate-700 text-emerald-400'
                    : 'hover:bg-slate-700'
                  }
                `}
              >
                {suggestion.type === 'predefined' && suggestion.category && (
                  <span className={`px-1.5 py-0.5 text-xs rounded ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.category.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{suggestion.label}</span>
                {suggestion.type === 'predefined' && suggestion.label !== suggestion.id && (
                  <span className="text-xs text-slate-500 ml-auto">{suggestion.id}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-slate-500 mt-1">
        {tags.length} of {maxTags} tags
      </p>
    </div>
  );
}
