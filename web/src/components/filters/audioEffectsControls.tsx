import React, { useState, useEffect } from 'react';
import { Sparkles, Disc, Radio } from 'lucide-react';

interface AudioEffectsControlsProps {
  speed: number;
  treble: number;
  nightcore: boolean;
  vaporwave: boolean;
  karaoke: boolean;
  onChangeSpeed: (val: number) => void;
  onChangeTreble: (val: number) => void;
  onToggleNightcore: () => void;
  onToggleVaporwave: () => void;
  onToggleKaraoke: () => void;
}

export const AudioEffectsControls: React.FC<AudioEffectsControlsProps> = ({
  speed,
  treble,
  nightcore,
  vaporwave,
  karaoke,
  onChangeSpeed,
  onChangeTreble,
  onToggleNightcore,
  onToggleVaporwave,
  onToggleKaraoke,
}) => {
  // Smooth Speed state
  const [localSpeed, setLocalSpeed] = useState<number>(speed);
  const [isSlidingSpeed, setIsSlidingSpeed] = useState<boolean>(false);

  useEffect(() => {
    if (!isSlidingSpeed) {
      setLocalSpeed(speed);
    }
  }, [speed, isSlidingSpeed]);

  const handleSpeedRelease = () => {
    setIsSlidingSpeed(false);
    onChangeSpeed(localSpeed);
  };

  // Smooth Treble state
  const [localTreble, setLocalTreble] = useState<number>(treble);
  const [isSlidingTreble, setIsSlidingTreble] = useState<boolean>(false);

  useEffect(() => {
    if (!isSlidingTreble) {
      setLocalTreble(treble);
    }
  }, [treble, isSlidingTreble]);

  const handleTrebleRelease = () => {
    setIsSlidingTreble(false);
    onChangeTreble(localTreble);
  };

  const speedPercent = ((localSpeed - 0.5) / 1.5) * 100;
  const treblePercent = ((localTreble + 10) / 20) * 100;

  return (
    <div className="bg-[#131E30] rounded-xl border border-slate-700/30 p-5 px-6">
      <h2 className="text-[15px] font-bold text-slate-100 mb-4">
        Efek Tambahan & Kecepatan (Geser Halus)
      </h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {/* Speed Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-slate-200 font-semibold">
              Kecepatan Pemutaran
            </span>
            <span className="text-[13px] text-blue-400 font-bold">
              {localSpeed.toFixed(2)}x
            </span>
          </div>
          <div className="relative h-1.5 bg-slate-700/40 rounded-full cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${speedPercent}%` }}
            />
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={localSpeed}
              aria-label="Kecepatan Pemutaran"
              onChange={(e) => {
                setIsSlidingSpeed(true);
                setLocalSpeed(parseFloat(e.target.value));
              }}
              onMouseUp={handleSpeedRelease}
              onTouchEnd={handleSpeedRelease}
              className="absolute -top-1.5 left-0 w-full h-4.5 opacity-0 cursor-pointer m-0"
            />
          </div>
          <div className="flex justify-between text-[10.5px] text-slate-400 mt-2">
            <span>0.5x (Lambat)</span>
            <span>1.0x (Normal)</span>
            <span>2.0x (Cepat)</span>
          </div>
        </div>

        {/* Treble Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-slate-200 font-semibold">
              Treble Boost / Cut
            </span>
            <span className="text-[13px] text-blue-400 font-bold">
              {localTreble > 0 ? `+${localTreble}` : localTreble} dB
            </span>
          </div>
          <div className="relative h-1.5 bg-slate-700/40 rounded-full cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${treblePercent}%` }}
            />
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={localTreble}
              aria-label="Treble Boost atau Cut"
              onChange={(e) => {
                setIsSlidingTreble(true);
                setLocalTreble(parseInt(e.target.value, 10));
              }}
              onMouseUp={handleTrebleRelease}
              onTouchEnd={handleTrebleRelease}
              className="absolute -top-1.5 left-0 w-full h-4.5 opacity-0 cursor-pointer m-0"
            />
          </div>
          <div className="flex justify-between text-[10.5px] text-slate-400 mt-2">
            <span>-10 dB</span>
            <span>0 dB</span>
            <span>+10 dB</span>
          </div>
        </div>

        {/* Toggle Modes */}
        <div className="flex flex-col gap-2.5 col-span-full pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nightcore Toggle */}
            <button
              type="button"
              onClick={onToggleNightcore}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${
                nightcore
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-300'
                  : 'border border-slate-700/40 bg-[#172234] text-slate-300 hover:bg-[#1E2C44]'
              }`}
            >
              <Sparkles size={15} className={nightcore ? 'text-blue-400' : 'text-slate-400'} />
              <span>Nightcore Mode</span>
            </button>

            {/* Vaporwave Toggle */}
            <button
              type="button"
              onClick={onToggleVaporwave}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${
                vaporwave
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-300'
                  : 'border border-slate-700/40 bg-[#172234] text-slate-300 hover:bg-[#1E2C44]'
              }`}
            >
              <Disc size={15} className={vaporwave ? 'text-blue-400' : 'text-slate-400'} />
              <span>Vaporwave (Slowed)</span>
            </button>

            {/* Karaoke Toggle */}
            <button
              type="button"
              onClick={onToggleKaraoke}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${
                karaoke
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-300'
                  : 'border border-slate-700/40 bg-[#172234] text-slate-300 hover:bg-[#1E2C44]'
              }`}
            >
              <Radio size={15} className={karaoke ? 'text-blue-400' : 'text-slate-400'} />
              <span>Vocal Cut (Karaoke)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
