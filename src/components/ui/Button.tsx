import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-pulse text-bg shadow-glow hover:brightness-105',
  secondary: 'bg-white/8 text-white border border-white/10 hover:bg-white/12',
  ghost: 'bg-transparent text-white/80 hover:bg-white/6',
  danger: 'bg-coral/15 text-coral border border-coral/30 hover:bg-coral/20',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
}

export function Button({ variant = 'primary', full, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 items-center justify-center rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        full && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
