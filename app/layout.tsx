import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Text Extraction Tool',
  description: 'Extract text from documents and download as text or Excel files',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
