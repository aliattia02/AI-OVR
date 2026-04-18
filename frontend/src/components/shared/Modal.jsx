import { useEffect } from 'react';

const SIZE_MAP = {
  sm: 420,
  md: 640,
  lg: 860,
};

export default function Modal({ title, children, onClose, size = 'md' }) {
  const width = SIZE_MAP[size] ?? SIZE_MAP.md;

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(12, 35, 64, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 40px rgba(12, 35, 64, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, color: '#0C2340' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}
