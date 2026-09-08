import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weather Sky — Beautiful Weather App',
  description: 'Real-time weather with 7-day forecast, hourly data, charts and location detection.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
