import { SVGProps } from 'react'

// Halyard mark: a mainsail raised on a mast, with the hull line below.
export function HalyardMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="6 3 36 44" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M24 5V41" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path d="M27 9L40 37H27Z" fill="currentColor" />
      <path d="M21 15L11 37H21Z" fill="currentColor" opacity="0.45" />
      <path
        d="M8 42Q24 47 40 42"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  )
}
