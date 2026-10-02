import type { ThemeMode } from '../../domain/models.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { cx } from '../../utils/cx.ts'

const options: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Colour theme">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={theme === option.id}
          className={cx('theme-option', theme === option.id && 'is-active')}
          onClick={() => setTheme(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
