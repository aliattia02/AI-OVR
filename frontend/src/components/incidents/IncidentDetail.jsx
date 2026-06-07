/**
 * frontend/src/components/incidents/IncidentDetail.jsx
 *
 * GAHAR migration changes:
 *   - JCI & Disclosure panel replaced with GAHAR Compliance panel.
 *   - JCI_CHAPTERS → GAHAR_SECTIONS (14 GAHAR section codes).
 *   - jci_chapter → gahar_section, jci_standard → gahar_gsr_code,
 *     jci_measurable_element → gahar_standard_code,
 *     jci_compliance_status → gahar_compliance_status,
 *     jci_evidence → gahar_evidence, jci_gap_analysis → gahar_gap_analysis,
 *     jci_action_plan → gahar_action_plan.
 *   - useSaveJCIFields → useSaveGAHARFields.
 *   - canViewJCI → canViewGAHAR.
 *   - All i18n keys migrated from incidents.jci.* → incidents.gahar.*.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAIFeedback, useIncident, useSaveAssessment, useSaveGAHARFields, useUpdateStatus } from '../../hooks/useIncidents';
import { ACTION_STATUSES, MEDICATION_ERROR_STAGES, NCC_MERP_CATEGORIES } from '../../utils/enums';
import { formatDate, formatDateTime, formatEnumLabel } from '../../utils/formatters';
import { incidentService } from '../../services/incidents';
import AIBadge from './AIBadge';
import RiskMatrix from './RiskMatrix';
import StatusBadge from './StatusBadge';
import EmptyState from '../shared/EmptyState';
import Spinner from '../shared/Spinner';

const STATUS_TRANSITIONS = {
  Created:        ['InProgress'],
  InProgress:     ['Evaluating'],
  Evaluating:     ['ActionTaken', 'MoreInfoNeeded'],
  MoreInfoNeeded: ['Evaluating'],
  ActionTaken:    ['Completed'],
  Completed:      [],
};

const CORE_FIELDS = [
  { key: 'incident_id',          labelKey: 'incidents.detail.fields.incident_id',          type: 'text' },
  { key: 'status',               labelKey: 'incidents.detail.fields.status',               type: 'enum' },
  { key: 'facility_name',        labelKey: 'incidents.detail.fields.facility_name',        type: 'text' },
  { key: 'facility_type',        labelKey: 'incidents.detail.fields.facility_type',        type: 'text' },
  { key: 'governorate',          labelKey: 'incidents.detail.fields.governorate',          type: 'text' },
  { key: 'administration',       labelKey: 'incidents.detail.fields.administration',       type: 'text' },
  { key: 'occurrence_date',      labelKey: 'incidents.detail.fields.occurrence_date',      type: 'date' },
  { key: 'occurrence_time',      labelKey: 'incidents.detail.fields.occurrence_time',      type: 'text' },
  { key: 'occurrence_location',  labelKey: 'incidents.detail.fields.occurrence_location',  type: 'text' },
  { key: 'registration_date',    labelKey: 'incidents.detail.fields.registration_date',    type: 'datetime' },
  { key: 'report_date',          labelKey: 'incidents.detail.fields.report_date',          type: 'date' },
  { key: 'report_time',          labelKey: 'incidents.detail.fields.report_time',          type: 'text' },
  { key: 'reporter_type',        labelKey: 'incidents.detail.fields.reporter_type',        type: 'enum' },
  { key: 'reporter_role',        labelKey: 'incidents.detail.fields.reporter_role',        type: 'text' },
  { key: 'involved_person',      labelKey: 'incidents.detail.fields.involved_person',      type: 'text' },
  { key: 'reporting_department', labelKey: 'incidents.detail.fields.reporting_department', type: 'text' },
  { key: 'responsible_manager',  labelKey: 'incidents.detail.fields.responsible_manager',  type: 'text' },
  { key: 'description',          labelKey: 'incidents.detail.fields.description',          type: 'multiline' },
  { key: 'error_classification', labelKey: 'incidents.detail.fields.error_classification', type: 'enum' },
  { key: 'specific_error',       labelKey: 'incidents.detail.fields.specific_error',       type: 'text' },
  { key: 'event_type',           labelKey: 'incidents.detail.fields.event_type',           type: 'enum' },
  { key: 'severity',             labelKey: 'incidents.detail.fields.severity',             type: 'enum' },
  { key: 'probability',          labelKey: 'incidents.detail.fields.probability',          type: 'enum' },
  { key: 'risk_score',           labelKey: 'incidents.detail.fields.risk_score',           type: 'text' },
  { key: 'recommendations',      labelKey: 'incidents.detail.fields.recommendations',      type: 'multiline' },
  { key: 'notes',                labelKey: 'incidents.detail.fields.notes',                type: 'multiline' },
  { key: 'medical_file_number',  labelKey: 'incidents.detail.fields.medical_file_number',  type: 'text' },
  { key: 'action_status',        labelKey: 'incidents.detail.fields.action_status',        type: 'enum' },
  { key: 'event_discovery_method', labelKey: 'incidents.detail.fields.event_discovery_method', type: 'enum' },
  { key: 'medication_stage_of_error', labelKey: 'incidents.detail.fields.medication_stage_of_error', type: 'enum' },
  { key: 'medication_merp_category',  labelKey: 'incidents.detail.fields.medication_merp_category',  type: 'text' },
];

// ── GAHAR: Disclosure fields (accreditation-agnostic, retained from JCI era) ──
const DISCLOSURE_FIELDS = [
  { key: 'disclosure_date',                  labelKey: 'incidents.gahar.disclosure_fields.disclosure_date',           type: 'date' },
  { key: 'disclosure_method',                labelKey: 'incidents.gahar.disclosure_fields.disclosure_method',         type: 'enum' },
  { key: 'disclosure_responsible',           labelKey: 'incidents.gahar.disclosure_fields.responsible_person',        type: 'text' },
  { key: 'vulnerable_patient',               labelKey: 'incidents.gahar.disclosure_fields.vulnerable_patient',        type: 'text' },
  { key: 'vulnerable_population_type',       labelKey: 'incidents.gahar.disclosure_fields.vulnerable_population_type', type: 'enum' },
  { key: 'workplace_violence',               labelKey: 'incidents.gahar.disclosure_fields.workplace_violence',        type: 'text' },
  { key: 'medication_error_merp_category',   labelKey: 'incidents.gahar.disclosure_fields.merp_category',            type: 'text' },
];

// ── GAHAR: 14 accreditation sections ──────────────────────────────────────────
const GAHAR_SECTIONS = [
  'PCC', // Patient-Centeredness Culture
  'ACT', // Access, Continuity & Transition
  'ICD', // Integrated Care Delivery
  'CSS', // Critical & Special Care Services
  'DAS', // Diagnostic & Ancillary Services
  'SAS', // Surgery, Anesthesia & Sedation
  'MMS', // Medication Management & Safety
  'EFS', // Environmental & Facility Safety
  'IPC', // Infection Prevention & Control
  'OGM', // Organization Governance & Management
  'CAI', // Community Assessment & Involvement
  'WFM', // Workforce Management
  'IMT', // Information Management & Technology
  'QPI', // Quality & Performance Improvement
];

const GAHAR_SECTION_LABELS = {
  PCC: 'incidents.gahar.sections.pcc',
  ACT: 'incidents.gahar.sections.act',
  ICD: 'incidents.gahar.sections.icd',
  CSS: 'incidents.gahar.sections.css',
  DAS: 'incidents.gahar.sections.das',
  SAS: 'incidents.gahar.sections.sas',
  MMS: 'incidents.gahar.sections.mms',
  EFS: 'incidents.gahar.sections.efs',
  IPC: 'incidents.gahar.sections.ipc',
  OGM: 'incidents.gahar.sections.ogm',
  CAI: 'incidents.gahar.sections.cai',
  WFM: 'incidents.gahar.sections.wfm',
  IMT: 'incidents.gahar.sections.imt',
  QPI: 'incidents.gahar.sections.qpi',
};

// ── GAHAR compliance statuses (same logical values as JCI, renamed) ────────────
const GAHAR_COMPLIANCE_STATUSES = ['Met', 'PartiallyMet', 'NotMet', 'NotApplicable'];

const GAHAR_COMPLIANCE_STATUS_LABELS = {
  Met:           'incidents.gahar.compliance_statuses.met',
  PartiallyMet:  'incidents.gahar.compliance_statuses.partially_met',
  NotMet:        'incidents.gahar.compliance_statuses.not_met',
  NotApplicable: 'incidents.gahar.compliance_statuses.not_applicable',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isNullish(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'not specified') return true;
  return false;
}

function formatFieldValue(type, value, placeholder) {
  if (isNullish(value)) return placeholder;
  if (type === 'date') return formatDate(value) || value;
  if (type === 'datetime') return formatDateTime(value) || value;
  if (type === 'enum') return formatEnumLabel(value) || value;
  return String(value);
}

function Panel({ title, children, defaultOpen = true, badge = null }) {
  return (
    <details open={defaultOpen} style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' }}>
      <summary
        style={{
          padding: '12px 14px',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 700,
          color: '#0C2340',
          borderBottom: '1px solid #F3F4F6',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span>{title}</span>
        {badge && <span onClick={(e) => e.preventDefault()}>{badge}</span>}
      </summary>
      <div style={{ padding: 14 }}>{children}</div>
    </details>
  );
}

function LockedPanelMessage({ message }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', fontWeight: 600 }}>
      <span role="img" aria-label="locked">🔒</span>
      <span>{message}</span>
    </div>
  );
}

// ── Inline summary badges shown on collapsed panels for top_management ──────────

const RISK_BADGE_STYLES = {
  critical: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  high:     { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  medium:   { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  low:      { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  none:     { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
};

function riskLevel(score) {
  if (!score && score !== 0) return 'none';
  if (score >= 9) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function RiskBadge({ score, severity, probability }) {
  const level = riskLevel(score);
  const s = RISK_BADGE_STYLES[level];
  const parts = [
    score ? `${score}` : null,
    severity ? formatEnumLabel(severity) : null,
    probability ? formatEnumLabel(probability) : null,
  ].filter(Boolean);
  const label = parts.length ? parts.join(' · ') : '—';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 12, fontWeight: 700,
      color: s.color, backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px',
    }}>
      {label}
    </span>
  );
}

const STATUS_SUMMARY_STYLES = {
  Completed:      { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  InProgress:     { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  Created:        { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  Evaluating:     { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  MoreInfoNeeded: { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
  ActionTaken:    { bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
};

function StatusSummaryBadge({ status }) {
  const s = STATUS_SUMMARY_STYLES[status] || RISK_BADGE_STYLES.none;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 12, fontWeight: 700,
      color: s.color, backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px',
    }}>
      {formatEnumLabel(status) || '—'}
    </span>
  );
}

function InlineError({ mutation, fallback }) {
  if (!mutation.isError) return null;
  const message =
    mutation.error?.response?.data?.detail ||
    mutation.error?.message ||
    fallback;
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{ color: '#DC2626', fontSize: 12, marginTop: 4, padding: '6px 10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}
    >
      {message}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IncidentDetail({ incidentId, role, onBack }) {
  const isQualityAdmin = role === 'quality_admin' || role === 'admin_tier_5' || role === 'top_management';
  // GAHAR compliance panel visible to quality_admin, top_management, and admin_tier_5
  const canViewGAHAR = role === 'quality_admin' || role === 'top_management' || role === 'admin_tier_5';
  const { t } = useTranslation();

  // Governorate: stored with underscores ("South_Sinai") → "South Sinai"
  const translateGovernorate = (v) =>
    v ? t(`common.governorates.${v.toLowerCase()}`, { defaultValue: v.replace(/_/g, ' ') }) : v;

  // Facility type: DB stores Arabic (مستشفى / مركز / وحدة) → English label
  const FACILITY_TYPE_KEY = { 'مستشفى': 'hospital', 'مركز': 'health_center', 'وحدة': 'health_unit' };
  const translateFacilityType = (v) => {
    if (!v) return v;
    const slug = FACILITY_TYPE_KEY[v];
    return slug ? t(`common.facility_types.${slug}`, { defaultValue: v }) : v;
  };

  // Occurrence location: DB stores slug (e.g. "emergency_room") → translated label.
  // Falls back to a formatted version of the slug so legacy free-text values
  // (e.g. "Not specified") still display gracefully.
  const translateLocation = (v) =>
    v ? t(`incidents.occurrence_location.${v}`, { defaultValue: formatEnumLabel(v) }) : v;

  const queryClient = useQueryClient();
  const { data: incident, isLoading, error, refetch } = useIncident(incidentId);

  const aiFeedback            = useAIFeedback();
  const assessmentMutation    = useSaveAssessment();
  const updateStatus          = useUpdateStatus();
  const saveGAHARFieldsMutation = useSaveGAHARFields(); // renamed from useSaveJCIFields

  const [assessment, setAssessment] = useState({ severity: '', probability: '' });
  const [capaForm,   setCapaForm]   = useState({
    corrective_action: '',
    preventive_action: '',
    action_date:       '',
    action_time:       '',
    action_status:     'Pending',
  });
  const [finalReportText, setFinalReportText] = useState('');

  // Collapsible sub-rows in the Incident Details panel
  const [expandedReporter,   setExpandedReporter]   = useState(false);
  const [expandedTimingMeta, setExpandedTimingMeta] = useState(false);

  // GAHAR compliance form state (renamed from jciForm)
  const [gaharForm, setGaharForm] = useState({
    gahar_section:                  '',
    gahar_gsr_code:                 '',
    gahar_standard_code:            '',
    gahar_compliance_status:        '',
    gahar_evidence:                 '',
    gahar_gap_analysis:             '',
    gahar_action_plan:              '',
    // Disclosure & patient-safety fields
    disclosure_date:                '',
    disclosure_method:              '',
    disclosure_responsible:         '',
    vulnerable_patient:             '',
    vulnerable_population_type:     '',
    workplace_violence:             '',
    medication_error_merp_category: '',
  });

  useEffect(() => {
    if (!incident) return;
    setAssessment({
      severity:    incident.severity    || '',
      probability: incident.probability || '',
    });
    setCapaForm({
      corrective_action: incident.corrective_action || '',
      preventive_action: incident.preventive_action || '',
      action_date:       incident.action_date       || '',
      action_time:       incident.action_time       || '',
      action_status:     incident.action_status     || 'Pending',
    });
    setFinalReportText(incident.final_report || '');
    // Initialise GAHAR form from loaded incident
    setGaharForm({
      gahar_section:                  incident.gahar_section                  || '',
      gahar_gsr_code:                 incident.gahar_gsr_code                 || '',
      gahar_standard_code:            incident.gahar_standard_code            || '',
      gahar_compliance_status:        incident.gahar_compliance_status        || '',
      gahar_evidence:                 incident.gahar_evidence                 || '',
      gahar_gap_analysis:             incident.gahar_gap_analysis             || '',
      gahar_action_plan:              incident.gahar_action_plan              || '',
      disclosure_date:                incident.disclosure_date                || '',
      disclosure_method:              incident.disclosure_method              || '',
      disclosure_responsible:         incident.disclosure_responsible         || '',
      vulnerable_patient:             incident.vulnerable_patient             ?? '',
      vulnerable_population_type:     incident.vulnerable_population_type     || '',
      workplace_violence:             incident.workplace_violence             ?? '',
      medication_error_merp_category: incident.medication_error_merp_category || '',
    });
  }, [incident]);

  const saveActionsMutation = useMutation({
    mutationFn: (payload) => incidentService.saveActions(incidentId, payload),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['incident', incidentId] }),
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
    return CORE_FIELDS.map((field) => ({
      key:   field.key,
      label: t(field.labelKey),
      type:  field.type,
      value: incident[field.key],
    }));
  }, [incident, t]);

  // Fast key → item lookup used by the structured details layout
  const detailsByKey = useMemo(() => {
    const map = {};
    detailsItems.forEach((item) => { map[item.key] = item; });
    return map;
  }, [detailsItems]);

  const handleSaveAssessment = async () => {
    if (!incident?.incident_id || !assessment.severity || !assessment.probability) return;
    await assessmentMutation.mutateAsync({
      id:   incident.incident_id,
      sev:  assessment.severity,
      prob: assessment.probability,
    });
  };

  const handleSaveCapa = async () => {
    if (!incident?.incident_id) return;
    await saveActionsMutation.mutateAsync({
      corrective_action: capaForm.corrective_action || null,
      preventive_action: capaForm.preventive_action || null,
      action_date:       capaForm.action_date       || null,
      action_time:       capaForm.action_time       || null,
      action_status:     capaForm.action_status,
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

  const handleAiAccept = async (suggestedClassification) => {
    if (!incident?.incident_id) return;
    const suggestion = suggestedClassification ?? incident?.ai_metadata?.auto_classification ?? null;
    await aiFeedback.mutateAsync({ id: incident.incident_id, sug: suggestion, chosen: suggestion });
  };

  const handleAiOverride = async (humanChoice, _eventType) => {
    if (!incident?.incident_id) return;
    await aiFeedback.mutateAsync({
      id:     incident.incident_id,
      sug:    incident?.ai_metadata?.auto_classification ?? null,
      chosen: humanChoice ?? null,
    });
  };

  // Save GAHAR compliance fields (renamed from handleSaveJCI)
  const handleSaveGAHAR = async () => {
    if (!incident?.incident_id) return;
    const payload = Object.fromEntries(
      Object.entries(gaharForm).map(([k, v]) => [k, v || null])
    );
    await saveGAHARFieldsMutation.mutateAsync({ id: incident.incident_id, payload });
  };

  // ── Guard renders ────────────────────────────────────────────────────────────

  if (!incidentId) {
    return (
      <EmptyState
        icon="📄"
        title={t('incidents.detail.no_selection_title')}
        subtitle={t('incidents.detail.no_selection_subtitle')}
      />
    );
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
      <div style={{ border: '1px solid #FECACA', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ color: '#991B1B', fontWeight: 700 }}>{t('incidents.detail.error_title')}</div>
        <div style={{ color: '#7F1D1D', fontSize: 13 }}>{error?.message || t('incidents.detail.error_subtitle')}</div>
        <button
          type="button"
          onClick={() => refetch?.()}
          style={{ width: 'fit-content', border: 'none', borderRadius: 8, backgroundColor: '#0B7D6B', color: '#FFFFFF', padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <EmptyState
        icon="📭"
        title={t('incidents.detail.not_found_title')}
        subtitle={t('incidents.detail.not_found_subtitle')}
      />
    );
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  };
  const labelStyle      = { display: 'grid', gap: 6, fontSize: 14, color: '#111827', fontWeight: 600 };
  const saveButtonStyle = (disabled) => ({
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#0B7D6B',
    color: '#FFFFFF',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: '#6B7280' }}>
            {incident.incident_id}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{incident.facility_name || t('common.placeholder_dash')}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
            <span>{t('incidents.detail.governorate_label')} {translateGovernorate(incident.governorate) || t('common.placeholder_dash')}</span>
            <span>{t('incidents.detail.registered_label')} {formatDateTime(incident.registration_date) || t('common.placeholder_dash')}</span>
            <StatusBadge status={incident.status} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBack?.()}
          style={{ border: '1px solid #D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#1F2937', padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('incidents.detail.back')}
        </button>
      </section>

      {/* ── AI Badge (hidden — feature not active) ───────────────────────────
      <Panel title={t('incidents.ai.panel_title')}>
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <AIBadge aiMetadata={incident.ai_metadata} onAccept={handleAiAccept} onOverride={handleAiOverride} />
            <InlineError mutation={aiFeedback} fallback={t('incidents.ai.error_save_feedback')} />
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>
      ── end AI Badge ────────────────────────────────────────────────────── */}

      {/* ── Incident Details ─────────────────────────────────────────────────── */}
      <Panel title={t('incidents.detail.incident_details_title')}>
        {(() => {
          const d = detailsByKey;

          // Status → color map
          const STATUS_PILL = {
            Completed:      { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
            InProgress:     { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
            Created:        { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
            Evaluating:     { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
            MoreInfoNeeded: { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
            ActionTaken:    { bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
            Pending:        { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
            Done:           { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
          };
          const STATUS_KEYS = new Set(['status', 'action_status']);

          // Reusable cell renderer — empty cells are compact & muted
          const cell = (fieldKey) => {
            const item = d[fieldKey];
            if (!item) return null;
            // Translate known DB-raw fields before display formatting
            const rawValue = fieldKey === 'governorate'         ? translateGovernorate(item.value)
                           : fieldKey === 'facility_type'       ? translateFacilityType(item.value)
                           : fieldKey === 'occurrence_location' ? translateLocation(item.value)
                           : item.value;
            const val = formatFieldValue(item.type, rawValue, t('common.placeholder_dash'));
            const empty = isNullish(item.value);
            const pill = STATUS_KEYS.has(fieldKey) && !empty ? STATUS_PILL[item.value] : null;
            return (
              <div style={{
                border: `1px solid ${empty ? '#F0F2F5' : '#E2E8EF'}`,
                borderRadius: 10,
                padding: empty ? '7px 14px' : '11px 14px',
                backgroundColor: empty ? '#FAFAFA' : '#F8FAFC',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ fontSize: 11, color: empty ? '#C4C9D4' : '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                {pill ? (
                  <span style={{
                    display: 'inline-block', width: 'fit-content',
                    fontSize: 13, fontWeight: 700,
                    color: pill.color, backgroundColor: pill.bg,
                    border: `1px solid ${pill.border}`,
                    borderRadius: 6, padding: '2px 9px',
                  }}>{val}</span>
                ) : (
                  <div style={{
                    fontSize: empty ? 14 : 16,
                    color: empty ? '#C4C9D4' : '#111827',
                    fontWeight: empty ? 400 : 500,
                    fontStyle: empty ? 'italic' : 'normal',
                    whiteSpace: item.type === 'multiline' ? 'pre-wrap' : 'normal',
                    wordBreak: 'break-word',
                  }}>{val}</div>
                )}
              </div>
            );
          };

          // Thin section separator with a label
          const divider = (label, icon) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                {icon}&nbsp;{label}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#ECEEF1' }} />
            </div>
          );

          // Clickable section separator — reveals a hidden sub-row on click
          const expandableDivider = (label, icon, expanded, onToggle) => (
            <div
              role="button"
              tabIndex={0}
              onClick={onToggle}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: expanded ? '#6B7280' : '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                {icon}&nbsp;{label}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: expanded ? '#D1D5DB' : '#ECEEF1', transition: 'background-color 0.15s' }} />
              <span style={{
                fontSize: 9, color: expanded ? '#6B7280' : '#C4C9D4',
                display: 'inline-block',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease, color 0.15s',
              }}>▼</span>
            </div>
          );

          const dot = <span style={{ color: '#D1D5DB', fontSize: 14, alignSelf: 'center' }}>·</span>;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* ── Facility — merged single card (row 1) ───────────────── */}
              <div style={{ border: '1px solid #DBEAFE', borderRadius: 10, padding: '12px 16px', backgroundColor: '#EFF6FF' }}>
                <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {d['facility_name']?.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#0C2340' }}>
                    {formatFieldValue('text', incident.facility_name, t('common.placeholder_dash'))}
                  </span>
                  {dot}
                  <span style={{ fontSize: 14, color: '#4B5563' }}>
                    <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{d['facility_type']?.label}: </span>
                    {translateFacilityType(incident.facility_type) || t('common.placeholder_dash')}
                  </span>
                  {dot}
                  <span style={{ fontSize: 14, color: '#4B5563' }}>
                    <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{d['governorate']?.label}: </span>
                    {translateGovernorate(incident.governorate) || t('common.placeholder_dash')}
                  </span>
                </div>
              </div>

              {/* ── Identity: ID · Status · Action Status ───────────────── */}
              {divider(t('incidents.detail.sections.identity') || 'الحادثة', '🔖')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {cell('incident_id')}
                {cell('status')}
                {cell('action_status')}
              </div>

              {/* ── Timing: 3-col ────────────────────────────────────────── */}
              {expandableDivider(t('incidents.detail.sections.timing') || 'التوقيت', '⏱', expandedTimingMeta, () => setExpandedTimingMeta(p => !p))}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {cell('occurrence_date')}
                {cell('occurrence_time')}
                {cell('occurrence_location')}
              </div>
              {expandedTimingMeta && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 4 }}>
                  {cell('registration_date')}
                  {cell('report_date')}
                  {cell('report_time')}
                </div>
              )}

              {/* ── People: 3-col × 2-row ─────────────────────────────────── */}
              {expandableDivider(t('incidents.detail.sections.reporter') || 'المُبلغ والمعني', '👤', expandedReporter, () => setExpandedReporter(p => !p))}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {cell('reporter_type')}
                {cell('reporter_role')}
                {cell('involved_person')}
              </div>
              {expandedReporter && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 4 }}>
                  {cell('reporting_department')}
                  {cell('responsible_manager')}
                  {cell('medical_file_number')}
                </div>
              )}

              {/* ── Classification: 4-col (error_classification now carries the 14 main categories) */}
              {divider(t('incidents.detail.sections.classification') || 'التصنيف', '🏷')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {cell('error_classification')}
                {cell('event_type')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {cell('specific_error')}
                {cell('event_discovery_method')}
              </div>

              {/* ── Medication Safety sub-section (shown when classification = MedicationSafety) */}
              {(incident.error_classification === 'MedicationSafety' || incident.medication_stage_of_error || incident.medication_merp_category) && (
                <>
                  {divider(t('incidents.detail.sections.medication_safety') || 'Medication Safety', '💊')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {cell('medication_stage_of_error')}
                    {cell('medication_merp_category')}
                  </div>
                </>
              )}

              {/* ── Narratives: full width ────────────────────────────────── */}
              {divider(t('incidents.detail.sections.narratives') || 'التفاصيل', '📝')}
              {cell('description')}
              {cell('recommendations')}
              {cell('notes')}

            </div>
          );
        })()}
      </Panel>

      {/* ── Risk Assessment (GAHAR SAC matrix) ──────────────────────────────── */}
      <Panel
        title={t('incidents.detail.risk_assessment_title')}
        defaultOpen={role !== 'top_management'}
        badge={role === 'top_management'
          ? <RiskBadge score={incident.risk_score} severity={incident.severity} probability={incident.probability} />
          : null}
      >
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <RiskMatrix
              severity={assessment.severity}
              probability={assessment.probability}
              onChange={({ severity, probability }) => {
                setAssessment({ severity, probability });
                assessmentMutation.reset();
              }}
            />
            <div>
              <button
                type="button"
                onClick={handleSaveAssessment}
                disabled={assessmentMutation.isPending || !assessment.severity || !assessment.probability}
                style={saveButtonStyle(assessmentMutation.isPending || !assessment.severity || !assessment.probability)}
              >
                {assessmentMutation.isPending ? t('incidents.detail.saving') : t('incidents.detail.save')}
              </button>
            </div>
            <InlineError mutation={assessmentMutation} fallback="Failed to save assessment." />
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>

      {/* ── CAPA ────────────────────────────────────────────────────────────── */}
      <Panel title={t('incidents.action.panel_title')}>
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={labelStyle}>
              {t('incidents.action.corrective_action')}
              <textarea
                rows={3}
                value={capaForm.corrective_action}
                onChange={(event) => { setCapaForm((prev) => ({ ...prev, corrective_action: event.target.value })); saveActionsMutation.reset(); }}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            <label style={labelStyle}>
              {t('incidents.action.preventive_action')}
              <textarea
                rows={3}
                value={capaForm.preventive_action}
                onChange={(event) => { setCapaForm((prev) => ({ ...prev, preventive_action: event.target.value })); saveActionsMutation.reset(); }}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label style={labelStyle}>
                {t('incidents.action.action_date')}
                <input type="date" value={capaForm.action_date} onChange={(event) => { setCapaForm((prev) => ({ ...prev, action_date: event.target.value })); saveActionsMutation.reset(); }} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t('incidents.action.action_time')}
                <input type="time" value={capaForm.action_time} onChange={(event) => { setCapaForm((prev) => ({ ...prev, action_time: event.target.value })); saveActionsMutation.reset(); }} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                {t('incidents.action.action_status')}
                <select value={capaForm.action_status} onChange={(event) => { setCapaForm((prev) => ({ ...prev, action_status: event.target.value })); saveActionsMutation.reset(); }} style={inputStyle}>
                  {ACTION_STATUSES.map((s) => (
                    <option key={s} value={s}>{formatEnumLabel(s)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <button type="button" onClick={handleSaveCapa} disabled={saveActionsMutation.isPending} style={saveButtonStyle(saveActionsMutation.isPending)}>
                {saveActionsMutation.isPending ? t('incidents.detail.saving') : t('incidents.detail.save')}
              </button>
            </div>
            <InlineError mutation={saveActionsMutation} fallback={t('incidents.action.error_save')} />
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>

      {/* ── Status Workflow ──────────────────────────────────────────────────── */}
      <Panel
        title={t('incidents.detail.status_workflow_title')}
        defaultOpen={role !== 'top_management'}
        badge={role === 'top_management'
          ? <StatusSummaryBadge status={incident.status} />
          : null}
      >
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{t('incidents.detail.current_status_label')}</span>
              <StatusBadge status={incident.status} />
            </div>

            {legalNextStates.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6B7280' }}>{t('incidents.detail.no_legal_next_states')}</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {legalNextStates.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    onClick={() => handleStatusTransition(nextStatus)}
                    disabled={updateStatus.isPending}
                    style={{ border: '1px solid #D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF', color: '#111827', padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: updateStatus.isPending ? 'not-allowed' : 'pointer', opacity: updateStatus.isPending ? 0.7 : 1 }}
                  >
                    {formatEnumLabel(nextStatus)}
                  </button>
                ))}
              </div>
            )}
            <InlineError mutation={updateStatus} fallback="Failed to update status." />
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>

      {/* ── Audit Trail ──────────────────────────────────────────────────────── */}
      <Panel title={t('incidents.detail.audit_trail_title')} defaultOpen={false}>
        {Array.isArray(incident.audit_trail) && incident.audit_trail.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {incident.audit_trail.map((entry, index) => (
              <div key={`${entry?.timestamp || 'audit'}-${index}`} style={{ borderLeft: '3px solid #D1D5DB', paddingLeft: 10, display: 'grid', gap: 2 }}>
                <div style={{ fontSize: 12, color: '#4B5563' }}>{formatDateTime(entry?.timestamp) || t('common.placeholder_dash')}</div>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{formatEnumLabel(entry?.action) || t('common.placeholder_dash')}</div>
                <div style={{ fontSize: 12, color: '#374151' }}>{t('incidents.detail.audit_user_label')} {entry?.user_id || t('common.placeholder_dash')}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#6B7280' }}>{t('incidents.detail.no_audit_entries')}</div>
        )}
      </Panel>

      {/* ── Final Report ─────────────────────────────────────────────────────── */}
      <Panel title={t('incidents.final.panel_title')}>
        {isQualityAdmin ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <textarea
              rows={5}
              value={finalReportText}
              onChange={(event) => { setFinalReportText(event.target.value); submitFinalMutation.reset(); }}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div>
              <button type="button" onClick={handleSubmitFinal} disabled={submitFinalMutation.isPending || !finalReportText.trim()} style={saveButtonStyle(submitFinalMutation.isPending || !finalReportText.trim())}>
                {submitFinalMutation.isPending ? t('common.submitting') : t('incidents.final.submit')}
              </button>
            </div>
            <InlineError mutation={submitFinalMutation} fallback={t('incidents.final.error_submit')} />
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>

      {/* ── GAHAR Compliance panel (replaces JCI & Disclosure) ───────────────── */}
      <Panel title={t('incidents.gahar.panel_title')} defaultOpen={false}>
        {canViewGAHAR ? (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Group A — editable disclosure & patient-safety fields */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                {t('incidents.gahar.disclosure_info_title')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.disclosure_date')}
                  <input
                    type="date"
                    value={gaharForm.disclosure_date}
                    onChange={(e) => { setGaharForm(p => ({ ...p, disclosure_date: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.disclosure_method')}
                  <select
                    value={gaharForm.disclosure_method}
                    onChange={(e) => { setGaharForm(p => ({ ...p, disclosure_method: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    <option value="verbal">{t('incidents.gahar.disclosure_methods.verbal')}</option>
                    <option value="written">{t('incidents.gahar.disclosure_methods.written')}</option>
                    <option value="not_yet">{t('incidents.gahar.disclosure_methods.not_yet')}</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.responsible_person')}
                  <input
                    type="text"
                    value={gaharForm.disclosure_responsible}
                    onChange={(e) => { setGaharForm(p => ({ ...p, disclosure_responsible: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.vulnerable_patient')}
                  <select
                    value={gaharForm.vulnerable_patient === '' ? '' : String(gaharForm.vulnerable_patient)}
                    onChange={(e) => { setGaharForm(p => ({ ...p, vulnerable_patient: e.target.value === '' ? '' : e.target.value === 'true' })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    <option value="true">{t('common.yes')}</option>
                    <option value="false">{t('common.no')}</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.vulnerable_population_type')}
                  <select
                    value={gaharForm.vulnerable_population_type}
                    onChange={(e) => { setGaharForm(p => ({ ...p, vulnerable_population_type: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    <option value="pediatric">{t('incidents.gahar.vulnerable_types.pediatric')}</option>
                    <option value="elderly">{t('incidents.gahar.vulnerable_types.elderly')}</option>
                    <option value="mental_health">{t('incidents.gahar.vulnerable_types.mental_health')}</option>
                    <option value="end_of_life">{t('incidents.gahar.vulnerable_types.end_of_life')}</option>
                    <option value="other">{t('incidents.gahar.vulnerable_types.other')}</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.workplace_violence')}
                  <select
                    value={gaharForm.workplace_violence === '' ? '' : String(gaharForm.workplace_violence)}
                    onChange={(e) => { setGaharForm(p => ({ ...p, workplace_violence: e.target.value === '' ? '' : e.target.value === 'true' })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    <option value="true">{t('common.yes')}</option>
                    <option value="false">{t('common.no')}</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.disclosure_fields.merp_category')}
                  <select
                    value={gaharForm.medication_error_merp_category}
                    onChange={(e) => { setGaharForm(p => ({ ...p, medication_error_merp_category: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {NCC_MERP_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {t(`incidents.merp_category.${cat.value.toLowerCase()}`, { defaultValue: `Category ${cat.value}` })}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.detail.fields.medication_stage_of_error')}
                  <select
                    value={gaharForm.medication_stage_of_error || ''}
                    onChange={(e) => { setGaharForm(p => ({ ...p, medication_stage_of_error: e.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {MEDICATION_ERROR_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {t(`incidents.medication_stage.${s.toLowerCase()}`, { defaultValue: s })}
                      </option>
                    ))}
                  </select>
                </label>

              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: 0 }} />

            {/* Group B — editable GAHAR compliance fields */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                {t('incidents.gahar.compliance_title')}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>

                  {/* GAHAR Section (replaces JCI Chapter) */}
                  <label style={labelStyle}>
                    {t('incidents.gahar.section_label')}
                    <select
                      value={gaharForm.gahar_section}
                      onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_section: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                      style={inputStyle}
                    >
                      <option value="">{t('incidents.gahar.select_section')}</option>
                      {GAHAR_SECTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec} — {t(GAHAR_SECTION_LABELS[sec] || '') || sec}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Compliance status */}
                  <label style={labelStyle}>
                    {t('incidents.gahar.compliance_status_label')}
                    <select
                      value={gaharForm.gahar_compliance_status}
                      onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_compliance_status: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                      style={inputStyle}
                    >
                      <option value="">{t('incidents.gahar.select_status')}</option>
                      {GAHAR_COMPLIANCE_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(GAHAR_COMPLIANCE_STATUS_LABELS[s] || '') || formatEnumLabel(s)}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* GSR Code (replaces JCI Standard) */}
                <label style={labelStyle}>
                  {t('incidents.gahar.gsr_code_label')}
                  <input
                    type="text"
                    value={gaharForm.gahar_gsr_code}
                    onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_gsr_code: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                    placeholder={t('incidents.gahar.gsr_code_placeholder')}
                    style={inputStyle}
                  />
                </label>

                {/* Standard Code (replaces JCI Measurable Element) */}
                <label style={labelStyle}>
                  {t('incidents.gahar.standard_code_label')}
                  <input
                    type="text"
                    value={gaharForm.gahar_standard_code}
                    onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_standard_code: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                    placeholder={t('incidents.gahar.standard_code_placeholder')}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.evidence_label')}
                  <textarea
                    rows={3}
                    value={gaharForm.gahar_evidence}
                    onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_evidence: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.gap_analysis_label')}
                  <textarea
                    rows={3}
                    value={gaharForm.gahar_gap_analysis}
                    onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_gap_analysis: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </label>

                <label style={labelStyle}>
                  {t('incidents.gahar.action_plan_label')}
                  <textarea
                    rows={3}
                    value={gaharForm.gahar_action_plan}
                    onChange={(event) => { setGaharForm((prev) => ({ ...prev, gahar_action_plan: event.target.value })); saveGAHARFieldsMutation.reset(); }}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </label>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveGAHAR}
                    disabled={saveGAHARFieldsMutation.isPending}
                    style={saveButtonStyle(saveGAHARFieldsMutation.isPending)}
                  >
                    {saveGAHARFieldsMutation.isPending ? t('incidents.detail.saving') : t('incidents.gahar.save_gahar')}
                  </button>
                </div>
                <InlineError mutation={saveGAHARFieldsMutation} fallback={t('incidents.gahar.error_save')} />
              </div>
            </div>
          </div>
        ) : (
          <LockedPanelMessage message={t('incidents.detail.locked_message')} />
        )}
      </Panel>
    </div>
  );
}