/**
 * Inline SVG icons + the shared icon-button style. No icon library on
 * purpose — a handful of hand-drawn 14px SVGs beats a dependency
 * (see TECH_STACK.md). All stroke `currentColor`, so they inherit the
 * parent's CSS colour and theme automatically.
 */
import React from 'react'

export const iconBtnStyle: React.CSSProperties = {
  width: 30, height: 30,
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, padding: 0,
}

export function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: 'transform 0.4s', transform: spinning ? 'rotate(360deg)' : 'none' }}>
      <path d="M1 7a6 6 0 0 1 10.39-4M13 7a6 6 0 0 1-10.39 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="11,3 11.39,3 13,1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="3,11 2.61,11 1,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2.93" y1="2.93" x2="4.34" y2="4.34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="11.66" y1="11.66" x2="13.07" y2="13.07" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="11.66" y1="4.34" x2="13.07" y2="2.93" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2.93" y1="13.07" x2="4.34" y2="11.66" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SystemIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function GitCommitIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="7" x2="4.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

export function MinusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

export function PersonIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M2 15c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
}

export const zoomBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
