import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '800'] })
export const metadata: Metadata = { title: 'Rental Power - الإجازات', manifest: '/manifest.json', icons: { icon: '/icon-192.png', apple: '/icon-192.png' } }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b6b3a' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl" data-theme="night"><body className={cairo.className}>{children}</body></html>
}
