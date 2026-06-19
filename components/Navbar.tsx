'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="bg-[#041A3E] text-white shadow-md border-b-4 border-orange-500 sticky top-0 z-40 w-full">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.jpg" alt="Nagrik Setu Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          <div>
            <h1 className="font-extrabold text-base leading-none tracking-tight group-hover:text-orange-400 transition-colors">
              NAGRIK SETU
            </h1>
            <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">
              Bridge of Trust
            </span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-200">
          <Link
            href="/"
            className={`hover:text-white transition-all py-1 ${pathname === '/' ? 'text-white border-b-2 border-white' : 'text-slate-300'
              }`}
          >
            {t('nav.home')}
          </Link>
          <Link
            href="/report"
            className={`hover:text-white transition-all py-1 flex items-center gap-1 ${pathname === '/report' ? 'text-white border-b-2 border-white' : 'text-slate-300'
              }`}
          >
            {t('nav.report')}
          </Link>

          <Link
            href="/track"
            className={`hover:text-white transition-all py-1 flex items-center gap-1 ${pathname?.startsWith('/track') ? 'text-white border-b-2 border-white' : 'text-slate-300'
              }`}
          >
            {t('nav.track')}
          </Link>
          <Link
            href="/accountability"
            className={`hover:text-white transition-all py-1 flex items-center gap-1 ${pathname?.startsWith('/accountability') ? 'text-white border-b-2 border-white' : 'text-slate-300'
              }`}
          >
            {t('nav.accountability')}
          </Link>
          <Link
            href="/admin"
            className={`px-3 py-1.5 border border-white hover:bg-white hover:text-[#041A3E] rounded-lg text-xs font-bold transition-all ${pathname?.startsWith('/admin') ? 'bg-white text-[#041A3E]' : 'text-white bg-transparent'
              }`}
          >
            {t('nav.admin')}
          </Link>
        </nav>

        {/* Language Toggle */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
