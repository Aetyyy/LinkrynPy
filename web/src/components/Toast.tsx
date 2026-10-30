import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ToastMessage } from '../types/music';

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const isError = toast.isError;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        backgroundColor: isError ? 'var(--status-danger)' : 'var(--primary-blue)',
        color: '#FFFFFF',
        padding: '10px 18px',
        borderRadius: '999px',
        fontWeight: '600',
        fontSize: '13px',
        zIndex: 999999,
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      className="animate-fade-in"
    >
      {isError ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{toast.text}</span>
    </div>
  );
};

