'use client';

import { useLanguage } from '@/lib/i18n';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
      <button
        onClick={() => setLanguage('en')}
        className={`hover:text-white transition-colors cursor-pointer focus:outline-none ${
          language === 'en' ? 'text-white font-bold underline decoration-2 underline-offset-4' : ''
        }`}
      >
        EN
      </button>
      <span className="text-slate-500">|</span>
      <button
        onClick={() => setLanguage('hi')}
        className={`hover:text-white transition-colors cursor-pointer focus:outline-none ${
          language === 'hi' ? 'text-white font-bold underline decoration-2 underline-offset-4' : ''
        }`}
      >
        हि
      </button>
    </div>
  );
}
