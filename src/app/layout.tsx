import type { Metadata } from 'next'
import { Inter, Bebas_Neue, Orbitron } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import RoleSidebar from '@/components/RoleSidebar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'], 
  variable: '--font-bebas' 
})
const orbitron = Orbitron({ 
  subsets: ['latin'], 
  variable: '--font-orbitron' 
})

export const metadata: Metadata = {
  title: 'Karteando.cl - Plataforma de Karting Competitivo',
  description: 'Sistema completo de karting con rankings, inscripciones y seguimiento en vivo',
  keywords: ['karting', 'racing', 'competition', 'chile', 'speedpark'],
  icons: {
    icon: '/images/Friendly-races/faviiconkart.jpeg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${bebasNeue.variable} ${orbitron.variable}`}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <RoleSidebar />
        </AuthProvider>
      </body>
    </html>
  )
}