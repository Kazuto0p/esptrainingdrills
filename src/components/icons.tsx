import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#12151e" />
      <circle cx="16" cy="16" r="8" stroke="#2ee6a6" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="2.4" fill="#f6c445" />
      <path d="M16 4.5v2.2M16 25.3v2.2M4.5 16h2.2M25.3 16h2.2" stroke="#8eaaef" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function IconBack(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14.5 6.5 7 12l7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h10" strokeLinecap="round" />
    </Base>
  )
}

export function IconHome(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 11.5 12 5l7.5 6.5V19a1 1 0 0 1-1 1h-4.2v-4.2H9.7V20H5.5a1 1 0 0 1-1-1v-7.5Z" strokeLinejoin="round" />
    </Base>
  )
}

export function IconGrid(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </Base>
  )
}

export function IconFlame(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5c.6 2.4-.4 3.6-1.6 4.8-1.3 1.3-2.6 2.6-2.6 5.1A4.2 4.2 0 0 0 12 17.6a4.2 4.2 0 0 0 4.2-4.2c0-1.5-.6-2.6-1.3-3.5-.4 1.3-1.1 1.8-1.7 1.4.4-2 .2-4.2-1.2-7.8Z" strokeLinejoin="round" />
    </Base>
  )
}

export function IconChart(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 19V9.5M12 19V5M19 19v-6" strokeLinecap="round" />
    </Base>
  )
}

export function IconSound(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 10h3.2L12 6.5v11L8.2 14H5v-4Z" strokeLinejoin="round" />
      <path d="M15 9.5a3.2 3.2 0 0 1 0 5" strokeLinecap="round" />
    </Base>
  )
}

export function IconMute(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 10h3.2L12 6.5v11L8.2 14H5v-4Z" strokeLinejoin="round" />
      <path d="m15 10 4 4M19 10l-4 4" strokeLinecap="round" />
    </Base>
  )
}

export function IconShield(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3s7 3 7 8c0 5-7 10-7 10S5 16 5 11c0-5 7-8 7-8z" strokeLinejoin="round" />
    </Base>
  )
}

export function IconTrophy(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" strokeLinejoin="round" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" strokeLinejoin="round" />
      <path d="M4 3h16v6a8 8 0 0 1-16 0V3Z" strokeLinejoin="round" />
      <path d="M12 17v4M8 21h8" strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  )
}
