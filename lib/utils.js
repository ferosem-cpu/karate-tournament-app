import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(d) {
  if (!d) return '—';
  try {
    let date;
    if (typeof d === 'string') date = new Date(d);
    else if (d.toDate) date = d.toDate();
    else if (d.seconds) date = new Date(d.seconds * 1000);
    else date = new Date(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function statusColor(status) {
  const map = {
    draft: 'bg-zinc-700 text-zinc-200 border-zinc-600',
    registration_open: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    registration_closed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    live: 'bg-red-600/20 text-red-300 border-red-500/40 animate-pulse',
    completed: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  };
  return map[status] || map.draft;
}

export function statusLabel(s) {
  return (s || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
