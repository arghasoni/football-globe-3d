import { useId } from 'react'

/** A classic black-and-white football: centre pentagon, seams, and patches at the rim. */
export default function Ball({ size = 12, label = 'Goal' }: { size?: number; label?: string }) {
  const clip = useId()
  return (
    <svg className="ball" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#f4f7f5" />
      <g clipPath={`url(#${clip})`} fill="#141a17" stroke="#141a17" strokeWidth="1.1" strokeLinejoin="round">
        <polygon points="12,7.4 16.4,10.6 14.7,15.7 9.3,15.7 7.6,10.6" />
        <path d="M12 7.4V2.6M16.4 10.6l4.6-1.5M14.7 15.7l2.8 3.9M9.3 15.7l-2.8 3.9M7.6 10.6L3 9.1" fill="none" />
        <circle cx="12" cy="-0.6" r="3.6" />
        <circle cx="23.4" cy="7.7" r="3.6" />
        <circle cx="19.1" cy="21.6" r="3.6" />
        <circle cx="4.9" cy="21.6" r="3.6" />
        <circle cx="0.6" cy="7.7" r="3.6" />
      </g>
      <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
    </svg>
  )
}
