import { MODES, type Mode } from '../../../shared/competitions'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeSwitch({ mode, onChange }: Props) {
  return (
    <nav className="mode-switch" aria-label="Competition type">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-switch__btn${m.id === mode ? ' is-active' : ''}`}
          aria-pressed={m.id === mode}
          onClick={() => onChange(m.id)}
        >
          <span className="mode-switch__long">{m.label}</span>
          <span className="mode-switch__short">{m.short}</span>
        </button>
      ))}
    </nav>
  )
}
