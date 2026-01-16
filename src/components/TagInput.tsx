'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  // Note: Tags are stored in lowercase, so we filter and display suggestions in lowercase
  // to provide consistent UX (what you see is what you get)
  const filteredSuggestions = useMemo(() => {
    const lowerInput = input.toLowerCase();
    return suggestions
      .map(s => s.toLowerCase())
      .filter(
        (s, index, arr) =>
          s.includes(lowerInput) &&
          !tags.includes(s) &&
          arr.indexOf(s) === index // dedupe after lowercase conversion
      );
  }, [suggestions, input, tags]);

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
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        addTag(filteredSuggestions[selectedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [input, tags, filteredSuggestions, selectedIndex, addTag, removeTag]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  }, []);

  const canAddMore = tags.length < maxTags;

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
      {showSuggestions && filteredSuggestions.length > 0 && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`
                w-full px-4 py-2 text-left text-sm transition
                ${index === selectedIndex
                  ? 'bg-slate-700 text-emerald-400'
                  : 'hover:bg-slate-700'
                }
              `}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-slate-500 mt-1">
        {tags.length} of {maxTags} tags
      </p>
    </div>
  );
}
