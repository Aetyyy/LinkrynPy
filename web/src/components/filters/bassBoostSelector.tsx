import React from 'react';
import type { BassBoostLevel } from '../../types/musicTypes';

interface BassBoostSelectorProps {
  currentLevel: BassBoostLevel;
  onSelectLevel: (level: BassBoostLevel) => void;
}

const BASS_BOOST_OPTIONS: { id: BassBoostLevel; label: string; desc: string }[] = [
  { id: 'off', label: 'Off', desc: 'Normal' },
  { id: 'soft', label: 'Soft', desc: '+6 dB' },
  { id: 'medium', label: 'Medium', desc: '+11 dB' },
  { id: 'hard', label: 'Hard', desc: '+16 dB (Punchy)' },
];

export const BassBoostSelector: React.FC<BassBoostSelectorProps> = ({
  currentLevel,
  onSelectLevel,
}) => {
  return (
    <div className="bg-[#131E30] rounded-xl border border-slate-700/30 p-5 px-6">
      <div className="mb-3.5">
        <h2 className="text-[15px] font-bold text-slate-100">
          Bass Boost
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Penguatan frekuensi rendah (low-end frequencies). Tingkat Hard dioptimalkan bertenaga (+16 dB).
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {BASS_BOOST_OPTIONS.map((opt) => {
          const isSelected = currentLevel === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectLevel(opt.id)}
              className={`p-3 px-3.5 rounded-lg text-left cursor-pointer transition-colors ${
                isSelected
                  ? 'border border-blue-500 bg-blue-500/15'
                  : 'border border-slate-700/40 bg-[#172234] hover:bg-[#1E2C44]'
              }`}
            >
              <p
                className={`text-[13.5px] ${
                  isSelected ? 'font-bold text-blue-300' : 'font-semibold text-slate-200'
                }`}
              >
                {opt.label}
              </p>
              <p
                className={`text-[11px] mt-0.5 ${
                  isSelected ? 'text-blue-400 font-medium' : 'text-slate-400'
                }`}
              >
                {opt.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
