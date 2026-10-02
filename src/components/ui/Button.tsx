import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../utils/cx.ts'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} {...props}>
      {icon}
      {children}
    </button>
  )
}
