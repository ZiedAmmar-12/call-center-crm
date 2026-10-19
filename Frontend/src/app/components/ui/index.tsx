// ─────────────────────────────────────────────────────────────────────────────
// components/ui/index.tsx
//
// SHARED UI PRIMITIVES — small, dumb, reusable pieces.
// "Dumb" means they receive data via props and render it. No state, no logic.
//
// TSX COMPONENT SYNTAX:
//   interface Props { ... }           → declare what the component accepts
//   export function Foo({ bar }: Props) → destructure props with their type
//   React.FC<Props> is optional — just typing the function directly is cleaner.
//
// CHILDREN:
//   children: React.ReactNode         → anything renderable (string, JSX, array)
//
// className MERGING:
//   We use template literals: `base-class ${extra}` — simple and readable.
//   You can add cn() (from clsx) later for conditional merging.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import type { QualificationType } from '../../types/leads'

// ── Badge ─────────────────────────────────────────────────────────────────────

// Maps your semantic color names to Tailwind classes.
// Keeping the map here means if you ever change the color system,
// you change it in one place.
const BADGE_CLASSES: Record<string, string> = {
  green:   'bg-green-500/10  text-green-700  dark:text-green-400',
  amber:   'bg-amber-500/10  text-amber-700  dark:text-amber-400',
  red:     'bg-red-500/10    text-red-700    dark:text-red-400',
  blue:    'bg-blue-500/10   text-blue-700   dark:text-blue-400',
  gray:    'bg-muted         text-muted-foreground border border-border',
  original:'bg-muted         text-muted-foreground border border-border',
  injected:'bg-blue-500/10   text-blue-700   dark:text-blue-400',
  processed:'bg-amber-500/10 text-amber-700  dark:text-amber-400',
  recycled: 'bg-green-500/10 text-green-700  dark:text-green-400',
}

interface BadgeProps {
  color?: string           // key from BADGE_CLASSES
  children: React.ReactNode
  className?: string       // allow overriding from outside
}

export function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  const colorClass = BADGE_CLASSES[color] ?? BADGE_CLASSES.gray
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {children}
    </span>
  )
}

// Convenience: renders a QualificationType directly as a badge
export function QualBadge({ qual }: { qual: QualificationType }) {
  return <Badge color={qual.color}>{qual.label}</Badge>
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  value: number | string
  label: string
  valueColor?: string   // optional Tailwind text color class
}

export function StatCard({ value, label, valueColor = '' }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className={`text-xl font-medium leading-tight ${valueColor}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
// A controlled toggle: parent owns the state, child just fires the callback.
// This is the React pattern for form-like elements.

interface ToggleProps {
  checked: boolean
  onChange: () => void   // no arguments — caller already knows the id
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0
        ${checked ? 'bg-green-600' : 'bg-border'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className={`
        absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full
        transition-transform ${checked ? 'translate-x-[14px]' : ''}
      `} />
    </button>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

interface ProgressBarProps {
  percent: number   // 0–100
  color?: 'green' | 'amber'
}

export function ProgressBar({ percent, color = 'green' }: ProgressBarProps) {
  // Math.min/max to clamp between 0 and 100 — defensive programming
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  const fillColor = color === 'green' ? 'bg-green-600' : 'bg-amber-500'
  return (
    <div className="h-1 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${fillColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ── InlinePanel ───────────────────────────────────────────────────────────────
// A subtle highlighted section that appears inline (no modal, no sidebar).
// Used for Inject / Rename forms that appear directly under a file row.

interface InlinePanelProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function InlinePanel({ title, onClose, children }: InlinePanelProps) {
  return (
    <div className="bg-muted/40 border-t border-border px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">{title}</p>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          ✕ Fermer
        </button>
      </div>
      {children}
    </div>
  )
}

// ── SummaryTable ──────────────────────────────────────────────────────────────
// Key/value pairs in a subtle box. Used in inject and recycle confirmations.

interface SummaryRow { label: string; value: React.ReactNode }

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden mb-3">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex justify-between items-center px-3 py-2 text-xs border-b border-border last:border-b-0"
        >
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Dot status indicator ──────────────────────────────────────────────────────

const DOT_COLORS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  gray:  'bg-border',
}

export function StatusDot({ color }: { color: keyof typeof DOT_COLORS }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[color]}`} />
}