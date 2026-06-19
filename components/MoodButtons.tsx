'use client';

import { useLanguage } from '@/lib/i18n';

interface MoodButtonsProps {
  onMoodSelect: (mood: 'frustrated' | 'unhappy' | 'patient') => void;
  currentMood: 'frustrated' | 'unhappy' | 'patient' | null;
  disabled?: boolean;
}

export default function MoodButtons({ onMoodSelect, currentMood, disabled = false }: MoodButtonsProps) {
  const { t } = useLanguage();

  const moods = [
    { key: 'frustrated', emoji: '😤', label: 'Frustrated', color: 'hover:bg-red-50 hover:border-red-300 text-red-700 bg-red-50/20 border-red-200' },
    { key: 'unhappy', emoji: '😞', label: 'Unhappy', color: 'hover:bg-orange-50 hover:border-orange-300 text-orange-700 bg-orange-50/20 border-orange-200' },
    { key: 'patient', emoji: '😐', label: 'Patient', color: 'hover:bg-blue-50 hover:border-blue-300 text-blue-700 bg-blue-50/20 border-blue-200' },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
      <h4 className="font-semibold text-slate-800 text-sm mb-4">
        How do you feel about the response?
      </h4>
      <div className="flex justify-center gap-3">
        {moods.map((m) => {
          const selected = currentMood === m.key;
          let activeClass = selected
            ? m.key === 'frustrated'
              ? 'bg-red-100 border-red-400 border-2 scale-105 shadow-md shadow-red-100'
              : m.key === 'unhappy'
              ? 'bg-orange-100 border-orange-400 border-2 scale-105 shadow-md shadow-orange-100'
              : 'bg-blue-100 border-blue-400 border-2 scale-105 shadow-md shadow-blue-100'
            : 'border-slate-200';

          return (
            <button
              key={m.key}
              disabled={disabled}
              onClick={() => onMoodSelect(m.key)}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${activeClass} ${m.color} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-2xl mb-1">{m.emoji}</span>
              <span className="text-xs font-bold">{m.label}</span>
            </button>
          );
        })}
      </div>
      {currentMood && (
        <p className="text-xs text-slate-500 mt-4 font-medium italic">
          {currentMood === 'patient' 
            ? 'Thank you for your patience. The assigned department has been notified.' 
            : 'Your feedback has been registered. The complaint has been flagged as high-priority.'}
        </p>
      )}
    </div>
  );
}
