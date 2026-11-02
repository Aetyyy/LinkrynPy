import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import type { ToastMessage } from '../types/musicTypes';

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const isError = toast.isError;

  return (
    <div
      className={`fixed top-5 right-6 z-[999999] flex items-center gap-2 px-4.5 py-2.5 rounded-full font-semibold text-[13px] text-white shadow-xl animate-fade-in ${
        isError ? 'bg-red-600' : 'bg-[#2563EB]'
      }`}
    >
      {isError ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{toast.text}</span>
    </div>
  );
};
