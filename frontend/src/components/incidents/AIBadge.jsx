import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ERROR_CLASSIFICATIONS, EVENT_TYPES } from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';

function formatConfidence(score, t) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return '';
  const value = Number(score);
  const percent = value <= 1 ? value * 100 : value;
  return t('incidents.ai.confidence_value', { percent: Math.round(percent) });
}

export default function AIBadge({ aiMetadata, onAccept, onOverride, readOnly = false }) {
  const { t } = useTranslation();
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [chosenClassification, setChosenClassification] = useState('');
  const [chosenEventType, setChosenEventType] = useState('');
  const classificationOptions = Array.isArray(ERROR_CLASSIFICATIONS) ? ERROR_CLASSIFICATIONS : [];
  const eventTypeOptions = Array.isArray(EVENT_TYPES) ? EVENT_TYPES : [];

  const defaultClassification = aiMetadata?.auto_classification ?? classificationOptions[0] ?? '';
  const defaultEventType = aiMetadata?.auto_event_type ?? eventTypeOptions[0] ?? '';

  useEffect(() => {
    setChosenClassification(defaultClassification);
    setChosenEventType(defaultEventType);
    setShowOverrideForm(false);
  }, [defaultClassification, defaultEventType]);

  if (!aiMetadata || aiMetadata.auto_classification === null || aiMetadata.auto_classification === undefined) {
    return null;
  }

  if (aiMetadata.human_reviewed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 11,
          padding: '3px 9px',
          borderRadius: 999,
          fontWeight: 600,
          color: '#1F2937',
          backgroundColor: '#E5E7EB',
        }}
      >
        {t('incidents.ai.reviewed')}
      </span>
    );
  }

  const confidenceLabel = formatConfidence(aiMetadata.classification_score, t);

  const handleAccept = () => {
    onAccept?.(aiMetadata.auto_classification, aiMetadata.auto_event_type ?? null);
  };

  const handleOverrideConfirm = () => {
    onOverride?.(chosenClassification, chosenEventType || null);
    setShowOverrideForm(false);
  };
  const requiresEventType = eventTypeOptions.length > 0;
  const isOverrideDisabled = !chosenClassification || (requiresEventType && !chosenEventType);

  return (
    <div
      style={{
        border: '1px solid #0B7D6B',
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          fontSize: 11,
          padding: '3px 9px',
          borderRadius: 999,
          fontWeight: 600,
          color: '#FFFFFF',
          backgroundColor: '#0B7D6B',
        }}
      >
        {t('incidents.ai.suggested')}
      </div>

      <div style={{ fontSize: 13, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <strong>{t('incidents.ai.classification_label')}</strong> {formatEnumLabel(aiMetadata.auto_classification)}
        </div>
        {aiMetadata.auto_event_type && (
          <div>
            <strong>{t('incidents.ai.event_type_label')}</strong> {formatEnumLabel(aiMetadata.auto_event_type)}
          </div>
        )}
        {confidenceLabel && (
          <div>
            <strong>{t('incidents.ai.confidence_label')}</strong> {confidenceLabel}
          </div>
        )}
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAccept}
              style={{
                border: 'none',
                borderRadius: 8,
                backgroundColor: '#059669',
                color: '#FFFFFF',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('incidents.ai.accept')}
            </button>

            <button
              type="button"
              onClick={() => setShowOverrideForm((prev) => !prev)}
              style={{
                border: '1px solid #9CA3AF',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('incidents.ai.override')}
            </button>
          </div>

          {showOverrideForm && (
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                padding: 10,
                display: 'grid',
                gap: 8,
              }}
            >
              <select
                value={chosenClassification}
                onChange={(event) => setChosenClassification(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #E5E7EB',
                  borderRadius: 6,
                  padding: '7px 8px',
                  fontSize: 12,
                  color: '#1F2937',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {classificationOptions.map((classification) => (
                  <option key={classification} value={classification}>
                    {formatEnumLabel(classification)}
                  </option>
                ))}
              </select>

              {eventTypeOptions.length > 0 && (
                <select
                  value={chosenEventType}
                  onChange={(event) => setChosenEventType(event.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    padding: '7px 8px',
                    fontSize: 12,
                    color: '#1F2937',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {eventTypeOptions.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {formatEnumLabel(eventType)}
                    </option>
                  ))}
                </select>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleOverrideConfirm}
                  disabled={isOverrideDisabled}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    backgroundColor: '#0C2340',
                    color: '#FFFFFF',
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isOverrideDisabled ? 'not-allowed' : 'pointer',
                    opacity: isOverrideDisabled ? 0.6 : 1,
                  }}
                >
                  {t('incidents.ai.confirm_override')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#1F2937', fontStyle: 'italic' }}>
        {t('incidents.ai.final_note')}
      </div>
    </div>
  );
}
