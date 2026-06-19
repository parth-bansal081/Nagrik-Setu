'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import Link from 'next/link';

export default function TrackSearchPage() {
  const [grievanceId, setGrievanceId] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = grievanceId.trim();
    if (cleanId) {
      router.push(`/track/${cleanId}`);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl block">🔍</span>
          <h2 className="font-extrabold text-slate-800 text-2xl tracking-tight">
            Track Complaint Status
          </h2>
          <p className="text-slate-500 text-sm">
            Enter your unique Grievance Reference ID below to view verification updates, assigned department, and resolutions.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Grievance ID
            </label>
            <input
              required
              type="text"
              placeholder="e.g. GRV-2026-A3F9B2C1"
              value={grievanceId}
              onChange={(e) => setGrievanceId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center uppercase tracking-wide placeholder:font-sans placeholder:normal-case"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            Track Status →
          </button>
        </form>

        <div className="text-center border-t border-slate-100 pt-4">
          <Link
            href="/"
            className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-all"
          >
            ← File a New Complaint
          </Link>
        </div>
      </div>
    </div>
  );
}
