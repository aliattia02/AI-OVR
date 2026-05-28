// frontend/src/components/patient/QRCodeView.jsx
// Displays the facility's anonymous patient-report QR code.
// Provides Copy Link and Download PNG actions.
// Null facilityUuid shows a fallback message instead of a broken QR code.

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';

const QR_SIZE = 200;

// Matches the public route: /report/:uuid  (App.jsx route map)
function buildPatientUrl(facilityUuid) {
  return `${window.location.origin}/report/${facilityUuid}`;
}

export default function QRCodeView({ facilityUuid }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const { t } = useTranslation();

  // Fallback — no UUID yet assigned to this facility
  if (!facilityUuid) {
    return (
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px dashed #D1D5DB',
          backgroundColor: '#F9FAFB',
          color: '#6B7280',
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        {t('patient.qr.no_link_assigned')}
      </div>
    );
  }

  const url = buildPatientUrl(facilityUuid);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }

  function handleDownload() {
    // The hidden QRCodeCanvas gives us a real <canvas> element to export as PNG
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `patient-qr-${facilityUuid}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  const buttonBase = {
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '20px 24px',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        width: 'fit-content',
      }}
    >
      {/* Visible QR code (SVG — crisp at all resolutions) */}
      <QRCodeSVG value={url} size={QR_SIZE} />

      {/* Hidden canvas used only for PNG download */}
      <div ref={canvasRef} style={{ display: 'none' }} aria-hidden="true">
        <QRCodeCanvas value={url} size={QR_SIZE} />
      </div>

      {/* URL display */}
      <div
        style={{
          maxWidth: QR_SIZE + 40,
          fontSize: 11,
          color: '#6B7280',
          wordBreak: 'break-all',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {url}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleCopy}
          style={{
            ...buttonBase,
            backgroundColor: copied ? '#D1FAE5' : '#F3F4F6',
            color: copied ? '#065F46' : '#374151',
          }}
        >
          {copied ? t('patient.qr.copied') : copyError ? t('patient.qr.copy_failed') : t('patient.qr.copy_link')}
        </button>

        <button
          onClick={handleDownload}
          style={{
            ...buttonBase,
            backgroundColor: '#1B6CA8',
            color: '#FFFFFF',
          }}
        >
          {t('patient.qr.download_png')}
        </button>
      </div>
    </div>
  );
}
