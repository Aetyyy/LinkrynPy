import React from 'react';
import type { EqualizerPreset } from '../../types/musicTypes';

interface PresetEqualizerSelectorProps {
  currentPreset: EqualizerPreset;
  onSelectPreset: (preset: EqualizerPreset) => void;
}

const EQ_PRESETS: { id: EqualizerPreset; label: string }[] = [
  { id: 'off', label: 'Flat (Normal)' },
  { id: 'pop', label: 'Pop' },
  { id: 'rock', label: 'Rock' },
  { id: 'classical', label: 'Klasik' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'electronic', label: 'Elektronik' },
  { id: 'vocal', label: 'Vocal Boost' },
  { id: 'custom', label: 'Custom EQ' },
];

export const PresetEqualizerSelector: React.FC<PresetEqualizerSelectorProps> = ({
  currentPreset,
  onSelectPreset,
}) => {
  return (
    <div className="bg-[#131E30] rounded-xl border border-slate-700/30 p-5 px-6">
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-slate-100">
            Preset Equalizer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih karakter suara yang sudah dikalibrasi atau kustomisasi manual di bawah.
          </p>
        </div>
        {currentPreset === 'custom' && (
          <span className="text-[11px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
            ● Mode Custom Aktif
          </span>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
        {EQ_PRESETS.map((preset) => {
          const isSelected = currentPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`p-2.5 px-3.5 rounded-lg text-[13px] transition-colors cursor-pointer text-center ${
                isSelected
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-300 font-bold shadow-xs'
                  : 'border border-slate-700/40 bg-[#172234] text-slate-300 hover:bg-[#1E2C44] hover:text-slate-100 font-medium'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
