import React from 'react';
import { X, LogIn, Disc3, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  apiBase,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] bg-[#152238] rounded-2xl border border-slate-700/30 p-8 sm:p-9 shadow-2xl text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 cursor-pointer transition-colors"
          aria-label="Tutup Modal"
        >
          <X size={18} />
        </button>

        {/* Emblem */}
        <div className="w-14 h-14 rounded-xl bg-[#2563EB] flex items-center justify-center mx-auto mb-4.5 shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
          <Disc3 size={30} className="text-white" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-slate-100 mb-2">
          Hubungkan Akun Discord
        </h2>
        <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
          Masuk dengan akun Discord Anda untuk otomatis mendeteksi Voice Channel yang sedang Anda masuki, memutar lagu, dan mengontrol bot Linkryn.
        </p>

        {/* Discord Login Button */}
        <a
          href={`${apiBase}/api/auth/discord`}
          className="flex items-center justify-center gap-2.5 w-full py-3 px-5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm font-bold no-underline mb-3.5 shadow-[0_4px_14px_rgba(88,101,242,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <LogIn size={18} />
          <span>Masuk dengan Discord</span>
        </a>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 py-1.5 px-3 cursor-pointer transition-colors"
        >
          Lanjut Jelajahi (Mode Tamu)
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-slate-400 text-[11px]">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Autentikasi aman melalui Discord OAuth2 Resmi</span>
        </div>
      </div>
    </div>
  );
};
