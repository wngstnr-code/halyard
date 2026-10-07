import { Metadata } from 'next'
import { satoshiFont } from '@/styles/fonts/satoshi/satoshi'
import NextTopLoader from 'nextjs-toploader'
import '@/styles/global.css'
import { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/theme/ThemeProvider'

export const metadata: Metadata = {
  // Absolute base for the Open Graph image. Set NEXT_PUBLIC_SITE_URL to the deployed origin.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: `Halyard | Borrow more on your bStocks`,
  description: `Halyard de-risks your Venus position before the US market closes and when health runs low, so you can borrow more against TSLAB, NVDAB and SPCXB on BNB Chain.`,
  icons: [
    { rel: 'icon', type: 'image/x-icon', url: '/favicon.ico' },
    {
      rel: 'icon',
      type: 'image/png',
      url: '/favicon-light.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      type: 'image/png',
      url: '/favicon-dark.png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
  openGraph: {
    title: `Halyard | Borrow more on your bStocks`,
    description: `Halyard de-risks your Venus position before the US market closes and when health runs low, so you can borrow more against TSLAB, NVDAB and SPCXB on BNB Chain.`,
    siteName: 'Halyard',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={satoshiFont.className}
        style={{ marginRight: '0px !important' }} // Required to prevent layout shift introduced by Rainbowkit
      >
        <NextTopLoader color="#0F3562" showSpinner={false} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
