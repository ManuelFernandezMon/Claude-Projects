import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-ember text-white hover:bg-ember-dark disabled:bg-ember/50 shadow-sm',
  secondary:
    'bg-surface text-ink border border-border hover:border-ink-soft disabled:opacity-50',
  ghost: 'text-ink-soft hover:text-ink disabled:opacity-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      {...props}
    />
  )
}
