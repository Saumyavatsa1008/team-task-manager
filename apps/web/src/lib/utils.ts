import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isPast } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | number | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return format(date, 'MMM d, yyyy');
}

export function formatRelative(d: Date | string | number | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function isOverdue(d: Date | string | number | null | undefined, status?: string) {
  if (!d || status === 'done') return false;
  const date = d instanceof Date ? d : new Date(d);
  return isPast(date);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Treat objects produced by firebase-admin Timestamps that travel through JSON */
export function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    const seconds = (value as { _seconds: number })._seconds;
    return new Date(seconds * 1000);
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds: number }).seconds;
    return new Date(seconds * 1000);
  }
  return null;
}
