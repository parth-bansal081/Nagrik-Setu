import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Nagrik Setu — Multi-Agent Civic Grievance Platform',
  description: 'An AI-powered multi-agent civic intelligence platform for verified resolutions and public accountability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900">
        <LanguageProvider>
          {/* Header */}
          <Navbar />

          {/* Main App Workspace */}
          <main className="flex-1 flex flex-col w-full">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
            <div className="max-w-6xl mx-auto px-4 space-y-2">
              <p className="font-bold text-slate-300">
                🏛️ Nagrik Setu — Civic Grievance Platform
              </p>
              <p>
                Powered by Band Multi-Agent Orchestration & Gemini Flash 1.5. Chittorgarh, Rajasthan.
              </p>
              <p className="text-slate-600 pt-2 border-t border-slate-800/50">
                &copy; 2026. All Rights Reserved. Built for Band of Agents Hackathon.
              </p>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
