import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAIFeedback, useIncident, useSaveAssessment, useUpdateStatus } from '../../hooks/useIncidents';
import { ACTION_STATUSES } from '../../utils/enums';
import { formatDate, formatDateTime, formatEnumLabel } from '../../utils/formatters';
import { incidentService } from '../../services/incidents';
import AIBadge from './AIBadge';
import RiskMatrix from './RiskMatrix';
import StatusBadge from './StatusBadge';
import EmptyState from '../shared/EmptyState';
import Spinner from '../shared/Spinner';

const STATUS_TRANSITIONS = {
  Created: ['InProgress'],
  InProgress: ['Evaluating'],
  Evaluating: ['ActionTaken', 'MoreInfoNeeded'],
  MoreInfoNeeded: ['Evaluating'],
  ActionTaken: ['Completed'],
  Completed: [],
};

const ARABIC_CORE_FIELDS = [
  { key: 'incident_id', label: 'رقم البلاغ', type: 'text' },
  { key: 'status', label: 'الحالة', type: 'enum' },
  { key: 'facility_name', label: 'اسم المنشأة', type: 'text' },
  { key: 'facility_type', label: 'نوع المنشأة', type: 'text' },
  { key: 'governorate', label: 'المحافظة', type: 'text' },
  { key: 'administration', label: 'الإدارة', type: 'text' },
  { key: 'occurrence_date', label: 'تاريخ الحدوث', type: 'date' },
  { key: 'occurrence_time', label: 'وقت الحدوث', type: 'text' },
  { key: 'occurrence_location', label: 'مكان الحدوث', type: 'text' },
  { key: 'registration_date', label: 'تاريخ التسجيل', type: 'datetime' },
  { key: 'report_date', label: 'تاريخ التقرير النهائي', type: 'date' },
  { key: 'report_time', label: 'وقت التقرير النهائي', type: 'text' },
  { key: 'reporter_type', label: 'نوع المبلّغ', type: 'enum' },
  { key: 'reporter_role', label: 'صفة المبلّغ', type: 'text' },
  { key: 'involved_person', label: 'الشخص المعني', type: 'text' },
  { key: 'reporting_department', label: 'القسم المبلّغ', type: 'text' },
  { key: 'responsible_manager', label: 'المدير المسؤول', type: 'text' },
  { key: 'description', label: 'وصف الواقعة', type: 'multiline' },
  { key: 'error_classification', label: 'تصنيف الخطأ', type: 'enum' },
  { key: 'specific_error', label: 'الخطأ المحدد', type: 'text' },
  { key: 'event_type', label: 'نوع الحدث', type: 'enum' },
  { key: 'severity', label: 'الخطورة', type: 'enum' },
  { key: 'probability', label: 'الاحتمالية', type: 'enum' },
  { key: 'risk_score', label: 'درجة المخاطر', type: 'text' },
  { key: 'recommendations', label: 'التوصيات', type: 'multiline' },
  { key: 'notes', label: 'ملاحظات', type: 'multiline' },
  { key: 'medical_file_number', label: 'رقم الملف الطبي', type: 'text' },
  { key: 'action_status', label: 'حالة الإجراء', type: 'enum' },
];

function formatFieldValue(type, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'date') return formatDate(value) || value;
  if (type === 'datetime') return formatDateTime(value) || value;
  if (type === 'enum') return formatEnumLabel(value) || value;
  return String(value);
}

function Panel({ title, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' }}>
      <summary
        style={{
          padding: '12px 14px',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 700,
          color: '#0C2340',
          borderBottom: '1px solid #F3F4F6',
          listStyle: 'none',
        }}
      >
        {title}
      </summary>
      <div style={{ padding: 14 }}>{children}</div>
    </details>
  );
}

function LockedPanelMessage() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: '#374151',
        fontWeight: 600,
      }}
    >
      <span role="img" aria-label="locked">
        🔒
      </span>
      <span>Requires Quality Admin access</span>
    </div>
  );
}

export default function IncidentDetail({ incidentId, role, onBack }) {
  const isQualityAdmin = role === 'quality_admin';
  const queryClient = useQueryClient();
  const { data: incident, isLoading, error, refetch } = useIncident(incidentId);

  const aiFeedback = useAIFeedback();
  const assessmentMutation = useSaveAssessment();
  const updateStatus = useUpdateStatus();

  const [assessment, setAssessment] = useState({ severity: '', probability: '' });
  const [capaForm, setCapaForm] = useState({
    corrective_action: '',
    preventive_action: '',
    action_date: '',
    action_time: '',
    action_status: 'Pending',
  });
  const [finalReportText, setFinalReportText] = useState('');

  useEffect(() => {
    if (!incident) return;
    setAssessment({
      severity: incident.severity || '',
      probability: incident.probability || '',
    });
    setCapaForm({
      corrective_action: incident.corrective_action || '',
      preventive_action: incident.preventive_action || '',
      action_date: incident.action_date || '',
      action_time: incident.action_time || '',
      action_status: incident.action_status || 'Pending',
    });
    setFinalReportText(incident.final_report || '');
  }, [incident]);

  const saveActionsMutation = useMutation({
    mutationFn: (payload) => incidentService.saveActions(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    },
  });

  const submitFinalMutation = useMutation({
    mutationFn: (text) => incidentService.submitFinal(incidentId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const legalNextStates = useMemo(() => {
    const current = incident?.status;
    if (!current || !STATUS_TRANSITIONS[current]) return [];
    return STATUS_TRANSITIONS[current];
  }, [incident?.status]);

  const detailsItems = useMemo(() => {
    if (!incident) return [];
    return ARABIC_CORE_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      value: incident[field.key],
    }));
  }, [incident]);

  const handleSaveAssessment = async () => {
    if (!incident?.incident_id || !assessment.severity || !assessment.probability) return;
    await assessmentMutation.mutateAsync({
      id: incident.incident_id,
      sev: assessment.severity,
      prob: assessment.probability,
    });
  };

  const handleSaveCapa = async () => {
    if (!incident?.incident_id) return;
    await saveActionsMutation.mutateAsync({
      corrective_action: capaForm.corrective_action || null,
      preventive_action: capaForm.preventive_action || null,
      action_date: capaForm.action_date || null,
      action_time: capaForm.action_time || null,
      action_status: capaForm.action_status,
    });
  };

  const handleStatusTransition = async (newStatus) => {
    if (!incident?.incident_id) return;
    await updateStatus.mutateAsync({ id: incident.incident_id, newStatus });
  };

  const handleSubmitFinal = async () => {
    if (!finalReportText.trim()) return;
    await submitFinalMutation.mutateAsync(finalReportText.trim());
  };

  const handleAiAccept = async () => {
    if (!incident?.incident_id) return;
    const suggestion = incident?.ai_metadata?.auto_classification ?? null;
    await aiFeedback.mutateAsync({ id: incident.incident_id, sug: suggestion, chosen: suggestion });
  };

  const handleAiOverride = async (humanChoice) => {
    if (!incident?.incident_id) return;
    await aiFeedback.mutateAsync({
      id: incident.incident_id,
      sug: incident?.ai_metadata?.auto_classification ?? null,
      chosen: humanChoice ?? null,
    });
  };

  if (!incidentId) {
    return <EmptyState icon="📄" title="No incident selected" subtitle="Choose an incident to view full details." />;
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid #FECACA',
          backgroundColor: '#FEF2F2',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ color: '#991B1B', fontWeight: 700 }}>Failed to load incident details.</div>
        <div style={{ color: '#7F1D1D', fontSize: 13 }}>{error?.message || 'Please try again.'}</div>
        <button
          type="button"
          onClick={() => refetch?.()}
          style={{
            width: 'fit-content',
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#0B7D6B',
            color: '#FFFFFF',
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!incident) {
    return <EmptyState icon="📭" title="Incident not found" subtitle="This incident may no longer be available." />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          padding: 14,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 10,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              color: '#6B7280',
            }}
          >
            {incident.incident_id}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{incident.facility_name || '—'}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
            <span>Governorate: {incident.governorate || '—'}</span>
            <span>Registered: {formatDateTime(incident.registration_date) || '—'}</span>
            <StatusBadge status={incident.status} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBack?.()}
          style={{
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            color: '#1F2937',
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </section>

      <Panel title="AI Badge">
        {isQualityAdmin ? (
          <AIBadge aiMetadata={incident.ai_metadata} onAccept={handleAiAccept} onOverride={handleAiOverride} />
        ) : (
          <LockedPanelMessage />
        )}
      </Panel>

      <Panel title="Incident Details">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {detailsItems.map((item) => (
            <div
              key={item.key}
              style={{
                border: '1px solid #F3F4F6',
                borderRadius: 10,
                padding: '10px 12px',
                backgroundColor: '#FAFAFA',
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 12, color: '#4B5563', fontWeight: 700 }}>{item.label}</div>
              <div
                style={{
                  fontSize: 13,
                  color: '#111827',
                  whiteSpace: item.type === 'multiline' ? 'pre-wrap' : 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {formatFieldValue(item.type, item.value)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Risk Assessment">
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <RiskMatrix
              severity={assessment.severity}
              probability={assessment.probability}
              onChange={({ severity, probability }) => setAssessment({ severity, probability })}
            />
            <div>
              <button
                type="button"
                onClick={handleSaveAssessment}
                disabled={assessmentMutation.isPending || !assessment.severity || !assessment.probability}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#0B7D6B',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    assessmentMutation.isPending || !assessment.severity || !assessment.probability
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: assessmentMutation.isPending || !assessment.severity || !assessment.probability ? 0.7 : 1,
                }}
              >
                {assessmentMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <LockedPanelMessage />
        )}
      </Panel>

      <Panel title="CAPA">
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#111827', fontWeight: 600 }}>
              Corrective Action
              <textarea
                rows={3}
                value={capaForm.corrective_action}
                onChange={(event) => setCapaForm((prev) => ({ ...prev, corrective_action: event.target.value }))}
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#111827', fontWeight: 600 }}>
              Preventive Action
              <textarea
                rows={3}
                value={capaForm.preventive_action}
                onChange={(event) => setCapaForm((prev) => ({ ...prev, preventive_action: event.target.value }))}
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#111827', fontWeight: 600 }}>
                Action Date
                <input
                  type="date"
                  value={capaForm.action_date}
                  onChange={(event) => setCapaForm((prev) => ({ ...prev, action_date: event.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#111827', fontWeight: 600 }}>
                Action Time
                <input
                  type="time"
                  value={capaForm.action_time}
                  onChange={(event) => setCapaForm((prev) => ({ ...prev, action_time: event.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#111827', fontWeight: 600 }}>
                Action Status
                <select
                  value={capaForm.action_status}
                  onChange={(event) => setCapaForm((prev) => ({ ...prev, action_status: event.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {ACTION_STATUSES.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {formatEnumLabel(statusOption)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveCapa}
                disabled={saveActionsMutation.isPending}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#0B7D6B',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saveActionsMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: saveActionsMutation.isPending ? 0.7 : 1,
                }}
              >
                {saveActionsMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <LockedPanelMessage />
        )}
      </Panel>

      <Panel title="Status Workflow">
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Current status:</span>
              <StatusBadge status={incident.status} />
            </div>

            {legalNextStates.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6B7280' }}>No legal next states.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {legalNextStates.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    onClick={() => handleStatusTransition(nextStatus)}
                    disabled={updateStatus.isPending}
                    style={{
                      border: '1px solid #D1D5DB',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: updateStatus.isPending ? 'not-allowed' : 'pointer',
                      opacity: updateStatus.isPending ? 0.7 : 1,
                    }}
                  >
                    {formatEnumLabel(nextStatus)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <LockedPanelMessage />
        )}
      </Panel>

      <Panel title="Audit Trail">
        {Array.isArray(incident.audit_trail) && incident.audit_trail.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {incident.audit_trail.map((entry, index) => (
              <div
                key={`${entry?.timestamp || 'audit'}-${index}`}
                style={{
                  borderLeft: '3px solid #D1D5DB',
                  paddingLeft: 10,
                  display: 'grid',
                  gap: 2,
                }}
              >
                <div style={{ fontSize: 12, color: '#4B5563' }}>{formatDateTime(entry?.timestamp) || '—'}</div>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
                  {formatEnumLabel(entry?.action) || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#374151' }}>User: {entry?.user_id || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#6B7280' }}>No audit entries available.</div>
        )}
      </Panel>

      <Panel title="Final Report">
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <textarea
              rows={5}
              value={finalReportText}
              onChange={(event) => setFinalReportText(event.target.value)}
              style={{
                width: '100%',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
            <div>
              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={submitFinalMutation.isPending || !finalReportText.trim()}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#0B7D6B',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitFinalMutation.isPending || !finalReportText.trim() ? 'not-allowed' : 'pointer',
                  opacity: submitFinalMutation.isPending || !finalReportText.trim() ? 0.7 : 1,
                }}
              >
                {submitFinalMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        ) : (
          <LockedPanelMessage />
        )}
      </Panel>
    </div>
  );
}
