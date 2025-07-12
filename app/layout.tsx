import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Demo Agent - Voice-Powered Product Demos',
  description: 'An AI-powered agent that conducts live product demonstrations using voice commands and automated website navigation.',
  keywords: ['AI', 'demo', 'voice', 'automation', 'sales', 'product demo'],
  authors: [{ name: 'AI Demo Agent Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-primary-50 to-accent-50">
          {children}
        </div>
      </body>
    </html>
  )
} 