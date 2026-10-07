import { SVGProps } from 'react'

// Halyard logotype: the sail mark followed by the wordmark, set in the app font.
export function HalyardLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-labelledby="logoTitle"
      className="logo-svg"
      role="img"
      viewBox="0 0 106 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title id="logoTitle">Halyard</title>
      <g className="svg-path" transform="translate(-2.5 -1.1) scale(0.47)">
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
      </g>
      <text
        fill="currentColor"
        fontFamily="inherit"
        fontSize="17"
        fontWeight="700"
        lengthAdjust="spacingAndGlyphs"
        letterSpacing="-0.4"
        textLength="76"
        x="29"
        y="15.5"
      >
        Halyard
      </text>
    </svg>
  )
}
