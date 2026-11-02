import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

interface CustomEqualizerBandsProps {
  bands: number[];
  onChange: (updatedBands: number[]) => void;
  onReset: () => void;
}

const FREQ_BANDS = [
  { label: '60 Hz', desc: 'Sub-Bass' },
  { label: '230 Hz', desc: 'Bass' },
  { label: '910 Hz', desc: 'Mid/Vokal' },
  { label: '3.6 kHz', desc: 'Presence' },
  { label: '14 kHz', desc: 'Treble/Air' },
];

export const CustomEqualizerBands: React.FC<CustomEqualizerBandsProps> = ({
  bands,
  onChange,
  onReset,
}) => {
  const safeBands = bands && bands.length === 5 ? bands : [0, 0, 0, 0, 0];
  const [localBands, setLocalBands] = useState<number[]>(safeBands);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const bandsKey = safeBands.join(',');

  // Sinkronkan saat prop bands berubah dari luar dan user tidak sedang drag slider
  useEffect(() => {
    if (!isDragging) {
      setLocalBands(bands && bands.length === 5 ? bands : [0, 0, 0, 0, 0]);
    }
  }, [bandsKey, isDragging, bands]);

  const handleBandSlider = (index: number, val: number) => {
    setIsDragging(true);
    const updated = [...localBands];
    updated[index] = val;
    setLocalBands(updated);
  };

  const handleRelease = () => {
    setIsDragging(false);
    onChange(localBands);
  };

  return (
    <div className="bg-[#131E30] rounded-xl border border-slate-700/30 p-5 px-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-blue-500" />
          <div>
            <h2 className="text-[15px] font-bold text-slate-100">
              Kustomisasi Equalizer (5-Band Frequency)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Geser frekuensi sesuai selera audio Anda. Pengaturan tersimpan otomatis saat dilepas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setLocalBands([0, 0, 0, 0, 0]);
            onReset();
          }}
          className="text-slate-400 hover:text-slate-200 text-[11.5px] cursor-pointer flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} />
          <span>Flat (0 dB)</span>
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3.5 p-4 bg-[#172234] rounded-xl border border-slate-700/40">
        {FREQ_BANDS.map((band, idx) => {
          const val = localBands[idx] !== undefined ? localBands[idx] : 0;
          const isGainPositive = val > 0;
          const isGainNegative = val < 0;

          return (
            <div
              key={band.label}
              className="flex flex-col items-center gap-3 py-2.5 px-1"
            >
              <span
                className={`text-xs font-bold min-w-[40px] text-center ${
                  isGainPositive
                    ? 'text-blue-400'
                    : isGainNegative
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {val > 0 ? `+${val} dB` : `${val} dB`}
              </span>

              <div className="h-[140px] flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={val}
                  aria-label={`Frekuensi ${band.label}`}
                  onChange={(e) => handleBandSlider(idx, parseInt(e.target.value, 10))}
                  onMouseUp={handleRelease}
                  onTouchEnd={handleRelease}
                  className="w-4.5 h-[130px] cursor-pointer accent-blue-500"
                  style={{
                    WebkitAppearance: 'slider-vertical',
                  }}
                />
              </div>

              <div className="text-center">
                <p className="text-[12.5px] font-bold text-slate-100">
                  {band.label}
                </p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  {band.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
