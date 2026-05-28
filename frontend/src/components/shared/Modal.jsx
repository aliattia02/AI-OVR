import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const SIZE_MAP = {
  sm: 420,
  md: 640,
  lg: 860,
};

export default function Modal({ title, children, onClose, size = 'md' }) {
  const width = SIZE_MAP[size] ?? SIZE_MAP['md'];
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const { t } = useTranslation();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const getFocusableElements = () => {
      if (!dialogRef.current) {
        return [];
      }

      return Array.from(
        dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled'));
    };

    const focusableElements = getFocusableElements();
    (focusableElements[0] ?? dialogRef.current)?.focus();

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = getFocusableElements();
      const first = elements[0] ?? dialogRef.current;
      const last = elements[elements.length - 1] ?? dialogRef.current;

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div
      onClick={() => onClose?.()}
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
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
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
            paddingBlock: 14, // RTL
            paddingInlineStart: 18, // RTL
            paddingInlineEnd: 52, // RTL
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            position: 'relative', // RTL
          }}
        >
          <h2 id={titleId} style={{ margin: 0, fontSize: 18, color: '#0C2340' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label={t('common.close_modal')}
            style={{
              position: 'absolute', // RTL
              insetInlineEnd: 12, // RTL
              top: '50%', // RTL
              transform: 'translateY(-50%)', // RTL
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
