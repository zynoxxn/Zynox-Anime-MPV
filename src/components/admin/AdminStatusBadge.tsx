import React from 'react';

export type AdminStatusVariant =
  | 'live'
  | 'published'
  | 'active'
  | 'draft'
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'banned'
  | 'suspended'
  | 'disabled'
  | 'pending'
  | 'open'
  | 'resolved'
  | 'closed'
  | 'admin'
  | 'super_admin'
  | 'editor'
  | 'moderator';

interface AdminStatusBadgeProps {
  status: string;
  variant?: AdminStatusVariant;
  label?: string;
  className?: string;
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
  status,
  variant,
  label,
  className = '',
}) => {
  const norm = (variant || status || '').toLowerCase().trim();

  let colorClasses = 'bg-white/10 text-[#94A3B8] border-white/10';

  if (['live', 'published', 'active', 'completed', 'resolved', 'fixed'].includes(norm)) {
    // Green
    colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
  } else if (['pending', 'upcoming', 'ongoing'].includes(norm)) {
    // Amber / Blue
    if (norm === 'ongoing') {
      colorClasses = 'bg-[#1E88FF]/15 text-[#1E88FF] border-[#1E88FF]/25';
    } else {
      colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/25';
    }
  } else if (['banned', 'suspended', 'disabled', 'open', 'danger', 'archived', 'rejected', 'failed', 'flagged'].includes(norm)) {
    // Red
    colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/25';
  } else if (['super_admin', 'superadmin', 'admin'].includes(norm)) {
    // Blue / Primary
    colorClasses = 'bg-[#1E88FF]/15 text-[#1E88FF] border-[#1E88FF]/30 font-semibold';
  } else if (['editor', 'moderator'].includes(norm)) {
    // Slate / Neutral
    colorClasses = 'bg-slate-400/15 text-slate-300 border-slate-400/25';
  }

  // Format label: "super_admin" -> "Super Admin", "ongoing" -> "Ongoing"
  const formattedText = label || (status
    ? status
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Unknown');

  return (
    <span
      className={`inline-flex items-center justify-center h-[22px] px-2.5 rounded-full text-[11px] font-medium border uppercase tracking-wider shrink-0 whitespace-nowrap ${colorClasses} ${className}`}
    >
      {formattedText}
    </span>
  );
};
