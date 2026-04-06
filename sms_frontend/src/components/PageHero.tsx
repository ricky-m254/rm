import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react'

export interface PageHeroStat {
  label: string
  value: string | number
  color?: string
}

type HeroIconComponent = ComponentType<{ size?: number; className?: string }>

export interface PageHeroProps {
  badge?: string
  badgeColor?: string
  theme?: string
  title: string
  titleAccent?: string
  subtitle: string
  icon?: ReactNode | HeroIconComponent
  stats?: PageHeroStat[]
  actions?: ReactNode
  gradient?: string
  ambient?: string
}

const BADGE_PRESETS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'rgba(16,185,129,0.18)', text: '#34d399', border: 'rgba(16,185,129,0.32)' },
  sky:     { bg: 'rgba(14,165,233,0.18)', text: '#7dd3fc', border: 'rgba(14,165,233,0.32)' },
  violet:  { bg: 'rgba(168,85,247,0.18)', text: '#c084fc', border: 'rgba(168,85,247,0.32)' },
  amber:   { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d', border: 'rgba(245,158,11,0.32)' },
  rose:    { bg: 'rgba(244,63,94,0.18)',  text: '#fda4af', border: 'rgba(244,63,94,0.32)'  },
  blue:    { bg: 'rgba(59,130,246,0.18)', text: '#93c5fd', border: 'rgba(59,130,246,0.32)' },
  orange:  { bg: 'rgba(249,115,22,0.18)', text: '#fdba74', border: 'rgba(249,115,22,0.32)' },
  pink:    { bg: 'rgba(236,72,153,0.18)', text: '#f9a8d4', border: 'rgba(236,72,153,0.32)' },
  teal:    { bg: 'rgba(20,184,166,0.18)', text: '#5eead4', border: 'rgba(20,184,166,0.32)' },
}

const GRADIENTS: Record<string, { bg: string; ambient: string }> = {
  emerald: {
    bg: 'linear-gradient(135deg, #071c11 0%, #0b2e1d 45%, #050f09 100%)',
    ambient: 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(5,150,105,0.2) 0%, transparent 50%)',
  },
  sky: {
    bg: 'linear-gradient(135deg, #050f1a 0%, #0b1b2e 45%, #0a1520 100%)',
    ambient: 'radial-gradient(ellipse at 80% 40%, rgba(56,189,248,0.4) 0%, transparent 55%), radial-gradient(ellipse at 15% 70%, rgba(16,185,129,0.25) 0%, transparent 50%)',
  },
  violet: {
    bg: 'linear-gradient(135deg, #0f0520 0%, #1a0b2e 45%, #120820 100%)',
    ambient: 'radial-gradient(ellipse at 75% 35%, rgba(168,85,247,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(99,102,241,0.25) 0%, transparent 50%)',
  },
  amber: {
    bg: 'linear-gradient(135deg, #1a0f00 0%, #2a1a05 45%, #150c01 100%)',
    ambient: 'radial-gradient(ellipse at 70% 40%, rgba(245,158,11,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 75%, rgba(249,115,22,0.25) 0%, transparent 50%)',
  },
  rose: {
    bg: 'linear-gradient(135deg, #1a0510 0%, #2e0b1a 45%, #150408 100%)',
    ambient: 'radial-gradient(ellipse at 75% 35%, rgba(244,63,94,0.35) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(168,85,247,0.2) 0%, transparent 50%)',
  },
  blue: {
    bg: 'linear-gradient(135deg, #050a20 0%, #0b1530 45%, #060c1a 100%)',
    ambient: 'radial-gradient(ellipse at 75% 35%, rgba(59,130,246,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(14,165,233,0.25) 0%, transparent 50%)',
  },
  orange: {
    bg: 'linear-gradient(135deg, #1a0800 0%, #2e1505 45%, #150600 100%)',
    ambient: 'radial-gradient(ellipse at 70% 35%, rgba(249,115,22,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(245,158,11,0.25) 0%, transparent 50%)',
  },
  pink: {
    bg: 'linear-gradient(135deg, #1a0515 0%, #2e0b25 45%, #15041a 100%)',
    ambient: 'radial-gradient(ellipse at 75% 35%, rgba(236,72,153,0.35) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(168,85,247,0.2) 0%, transparent 50%)',
  },
  teal: {
    bg: 'linear-gradient(135deg, #011a18 0%, #052e28 45%, #010f0d 100%)',
    ambient: 'radial-gradient(ellipse at 75% 35%, rgba(20,184,166,0.4) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(16,185,129,0.25) 0%, transparent 50%)',
  },
}

export default function PageHero({
  badge = 'MODULE',
  badgeColor = 'emerald',
  theme,
  title,
  titleAccent,
  subtitle,
  icon,
  stats = [],
  actions,
  gradient,
  ambient,
}: PageHeroProps) {
  const colorKey = theme ?? badgeColor
  const badgeStyle = BADGE_PRESETS[colorKey] ?? BADGE_PRESETS.emerald
  const gradientStyle = GRADIENTS[gradient ?? colorKey] ?? GRADIENTS.emerald
  const bg = gradientStyle.bg
  const am = ambient ?? gradientStyle.ambient
  const renderedIcon = (() => {
    if (!icon || typeof icon === 'boolean') return null
    if (isValidElement(icon) || typeof icon === 'string' || typeof icon === 'number') {
      return icon
    }
    return createElement(icon as HeroIconComponent, { size: 28, className: 'text-white' })
  })()

  return (
    <div
      className="col-span-12 relative overflow-hidden rounded-2xl sm:rounded-3xl px-5 py-7 sm:px-8 sm:py-9"
      style={{ background: bg }}
    >
      {/* Ambient light blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: am, opacity: 0.9 }} />

      {/* Subtle grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        {/* Left: badge + title + subtitle */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {/* Icon bubble */}
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-lg"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
              {renderedIcon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
              style={{ background: badgeStyle.bg, border: `1px solid ${badgeStyle.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: badgeStyle.text }} />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wide uppercase" style={{ color: badgeStyle.text }}>
                {badge}
              </span>
            </div>
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
              {title}
              {titleAccent && (
                <>
                  <br className="sm:hidden" />
                  <span className="sm:ml-2" style={{ color: badgeStyle.text }}>{titleAccent}</span>
                </>
              )}
            </h1>
            {/* Subtitle */}
            <p className="mt-2 text-sm text-slate-300/90 max-w-lg leading-relaxed">{subtitle}</p>
            {/* Stats row */}
            {stats.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {stats.map(s => (
                  <div key={s.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(4px)' }}>
                    <span className="text-xs font-bold text-white/70">{s.label}:</span>
                    <span className="text-xs font-bold" style={{ color: s.color ?? badgeStyle.text }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {actions && (
          <div className="flex-shrink-0 flex flex-wrap gap-2 items-start sm:items-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
