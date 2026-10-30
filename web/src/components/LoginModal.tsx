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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '440px',
          maxWidth: '100%',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: '18px',
          border: '1px solid var(--border-subtle)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          position: 'relative',
        }}
        className="animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={18} />
        </button>

        {/* Emblem */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: 'var(--primary-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 8px 24px rgba(57, 120, 246, 0.35)',
          }}
        >
          <Disc3 size={30} color="#FFFFFF" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.4px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Hubungkan Akun Discord
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Masuk dengan akun Discord Anda untuk otomatis mendeteksi Voice Channel yang sedang Anda masuki, memutar lagu, dan mengontrol bot Linkryn.
        </p>

        {/* Discord Login Button */}
        <a
          href={`${apiBase}/api/auth/discord`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#5865F2',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            textDecoration: 'none',
            marginBottom: '14px',
            boxShadow: '0 4px 14px rgba(88, 101, 242, 0.35)',
            transition: 'background 0.18s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4752C4';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#5865F2';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <LogIn size={18} />
          <span>Masuk dengan Discord</span>
        </a>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12.5px',
            cursor: 'pointer',
            padding: '6px 12px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Lanjut Jelajahi (Mode Tamu)
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px', color: 'var(--text-muted)', fontSize: '11px' }}>
          <ShieldCheck size={14} color="var(--status-success)" />
          <span>Autentikasi aman melalui Discord OAuth2 Resmi</span>
        </div>
      </div>
    </div>
  );
};
