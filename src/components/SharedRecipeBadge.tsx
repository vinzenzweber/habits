'use client';

interface SharedRecipeBadgeProps {
  variant: 'from' | 'shared';
  ownerName?: string;
  className?: string;
}

const ShareIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

/**
 * Badge to indicate recipe sharing status
 *
 * @param variant - 'from' shows owner name (on shared recipes), 'shared' shows shared icon (on my recipes)
 * @param ownerName - Name of the recipe owner (required when variant is 'from')
 * @param className - Additional CSS classes
 */
export function SharedRecipeBadge({ variant, ownerName, className = '' }: SharedRecipeBadgeProps) {
  if (variant === 'from') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400 ${className}`}
      >
        <UserIcon />
        <span className="truncate max-w-[100px]">{ownerName}</span>
      </span>
    );
  }

  // variant === 'shared'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400 ${className}`}
    >
      <ShareIcon />
      <span>Shared</span>
    </span>
  );
}
