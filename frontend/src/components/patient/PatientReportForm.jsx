import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { incidentService } from '../../services/incidents';
import { useDirection } from '../../hooks/useDirection'; // RTL

const REPORTER_ROLE_OPTIONS = [
  { value: 'Patient',       labelKey: 'patient.report.reporter_roles.patient' },
  { value: 'Visitor',       labelKey: 'patient.report.reporter_roles.visitor' },
  { value: 'Family Member', labelKey: 'patient.report.reporter_roles.family_member' },
];

// ── Panel component (mirrors NewIncidentForm / IncidentDetail) ─────────────────
function Panel({ title, icon, children, defaultOpen = true, step = null }) {
  return (
    <details
      open={defaultOpen}
      style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' }}
    >
      <summary
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          borderBottom: '1px solid #F3F4F6',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step !== null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: '#0C2340',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {step}
            </span>
          )}
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0C2340' }}>{title}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, flexShrink: 0 }}>▾</span>
      </summary>
      <div style={{ padding: '16px' }}>{children}</div>
    </details>
  );
}

// ── Section divider (mirrors NewIncidentForm's Divider) ───────────────────────
function Divider({ label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#B0B8C4',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          whiteSpace: 'nowrap',
        }}
      >
        {icon}&nbsp;{label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#ECEEF1' }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PatientReportForm({ facilityUuid: facilityUuidProp }) {
  const { facility_uuid: facilityUuidFromParams } = useParams();
  const facilityUuid = facilityUuidProp || facilityUuidFromParams;
  const { isRTL, dir } = useDirection(); // RTL
  const { t } = useTranslation();

  const [facilityInfo, setFacilityInfo] = useState({
    facilityName: '',
    administration: '',
    governorate: '',
  });
  const [facilityLoadError, setFacilityLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      description:         '',
      occurrence_date:     '',
      occurrence_time:     '',
      occurrence_location: '',
      reporter_role:       'Patient',
      medical_file_number: '',
    },
  });

  // ── Load facility info ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadFacilityInfo = async () => {
      if (!facilityUuid) {
        setFacilityLoadError(t('patient.report.invalid_link'));
        return;
      }

      try {
        setFacilityLoadError('');
        const { data } = await api.get(`/patients/facility-info/${facilityUuid}`);
        if (!mounted) return;
        setFacilityInfo({
          facilityName:   data.facility_name_en || data.facility_name || t('patient.report.facility_fallback'),
          administration: data.administration_en || data.administration || '',
          governorate:    data.governorate || '',
        });
      } catch (error) {
        if (!mounted) return;
        setFacilityInfo({ facilityName: t('patient.report.facility_fallback'), administration: '', governorate: '' });
        setFacilityLoadError(
          error?.response?.status === 404
            ? t('patient.report.link_not_recognised')
            : (error?.message || t('patient.report.load_error'))
        );
      }
    };

    loadFacilityInfo();
    return () => { mounted = false; };
  }, [facilityUuid]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: (payload) => incidentService.submitPatientReport(facilityUuid, payload),
    onSuccess: (result) => {
      setSuccessMessage(
        t('patient.report.success', {
          reference: result?.incident_id || t('patient.report.reference_na'),
        })
      );
    },
  });

  const onSubmit = async (values) => {
    setSuccessMessage('');
    await submitMutation.mutateAsync({
      description:         values.description,
      occurrence_date:     values.occurrence_date     || null,
      occurrence_time:     values.occurrence_time     || null,
      occurrence_location: values.occurrence_location || null,
      reporter_role:       values.reporter_role,
      medical_file_number: values.medical_file_number || null,
    });
  };

  // ── Shared style tokens (mirrors NewIncidentForm / IncidentDetail) ──────────
  const fieldStyle = useMemo(
    () => ({
      width: '100%',
      border: '1px solid #D1D5DB',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 14,
      color: '#111827',
      backgroundColor: '#FFFFFF',
      boxSizing: 'border-box',
    }),
    []
  );

  const labelStyle = {
    display: 'grid',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    textAlign: 'start', // RTL
  };

  const errorStyle = {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'start', // RTL
    padding: '4px 8px',
    backgroundColor: '#FEF2F2',
    borderRadius: 5,
    border: '1px solid #FECACA',
  };

  const hintStyle = {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 400,
    marginTop: 2,
  };

  const { facilityName, administration, governorate } = facilityInfo;
  const hasMeta = administration || governorate;

  return (
    <div
      dir={dir}
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        padding: '12px 12px 20px',
        display: 'grid',
        gap: 12,
      }}
    >

      {/* ── Form header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          padding: '14px 16px',
          display: 'grid',
          gap: 4,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0C2340' }}>
          {t('patient.report.page_title')}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          {t('patient.report.page_subtitle')}
        </div>
      </div>

      {/* ── Facility identity card ─────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid #D1D5DB',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'grid',
          gap: 4,
          backgroundColor: '#F9FAFB',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0C2340' }}>
          {facilityName || t('patient.report.facility_fallback')}
        </h2>

        {hasMeta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4 }}>
            {administration && (
              <span
                style={{
                  fontSize: 13,
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexDirection: isRTL ? 'row-reverse' : 'row', // RTL
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4ZM3 10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6ZM14 9a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-2Z"
                    fill="#6B7280"
                  />
                </svg>
                {administration}
              </span>
            )}
            {governorate && (
              <span
                style={{
                  fontSize: 13,
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexDirection: isRTL ? 'row-reverse' : 'row', // RTL
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.05 4.05a7 7 0 1 1 9.9 9.9L10 18.9l-4.95-4.95a7 7 0 0 1 0-9.9ZM10 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                    fill="#6B7280"
                  />
                </svg>
                {governorate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid #D1D5DB',
          backgroundColor: '#F9FAFB',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
          color: '#374151',
        }}
      >
        {t('common.disclaimer')}
      </div>

      {facilityLoadError && (
        <div style={{ ...errorStyle, fontWeight: 600, padding: '10px 14px' }}>
          {facilityLoadError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 12 }}>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1 — Incident Description
        ══════════════════════════════════════════════════════════════════════ */}
        <Panel
          title={t('incidents.detail.fields.description')}
          icon="📝"
          step={1}
          defaultOpen={true}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {t('patient.report.description_hint')}
            </div>
            <label style={labelStyle}>
              <textarea
                rows={6}
                style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                placeholder={t('patient.report.description_placeholder')}
                {...register('description', { required: t('patient.report.description_required') })}
              />
              {errors.description && (
                <div style={errorStyle}>{errors.description.message}</div>
              )}
            </label>
          </div>
        </Panel>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2 — When & Where
        ══════════════════════════════════════════════════════════════════════ */}
        <Panel
          title={t('patient.report.section_when_where')}
          icon="📅"
          step={2}
          defaultOpen={true}
        >
          <div style={{ display: 'grid', gap: 12 }}>

            {/* Date + Time — 2-col */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <label style={labelStyle}>
                {t('incidents.detail.fields.occurrence_date')}
                <input
                  type="date"
                  style={fieldStyle}
                  {...register('occurrence_date')}
                />
                <div style={hintStyle}>{t('patient.report.date_hint')}</div>
              </label>

              <label style={labelStyle}>
                {t('incidents.detail.fields.occurrence_time')}
                <input
                  type="time"
                  style={fieldStyle}
                  {...register('occurrence_time')}
                />
                <div style={hintStyle}>{t('patient.report.time_hint')}</div>
              </label>
            </div>

            <Divider label={t('patient.report.divider_location')} icon="📍" />

            <label style={labelStyle}>
              {t('incidents.detail.fields.occurrence_location')}
              <input
                style={fieldStyle}
                placeholder={t('patient.report.location_placeholder')}
                {...register('occurrence_location')}
              />
              <div style={hintStyle}>{t('patient.report.location_hint')}</div>
            </label>

          </div>
        </Panel>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3 — About the Reporter
        ══════════════════════════════════════════════════════════════════════ */}
        <Panel
          title={t('patient.report.section_about_you')}
          icon="👤"
          step={3}
          defaultOpen={true}
        >
          <div style={{ display: 'grid', gap: 12 }}>

            <label style={labelStyle}>
              {t('incidents.new.reporter_role_label')} *
              <select
                style={fieldStyle}
                {...register('reporter_role', { required: t('patient.report.reporter_role_required') })}
              >
                {REPORTER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
              {errors.reporter_role && (
                <div style={errorStyle}>{errors.reporter_role.message}</div>
              )}
              <div style={hintStyle}>{t('patient.report.reporter_role_hint')}</div>
            </label>

            <Divider label={t('incidents.new.divider_patient')} icon="🗂️" />

            <label style={labelStyle}>
              {t('incidents.detail.fields.medical_file_number')}
              <input
                style={fieldStyle}
                placeholder={t('patient.report.medical_file_placeholder')}
                {...register('medical_file_number')}
              />
              <div style={hintStyle}>🔒 {t('incidents.new.stored_encrypted')}</div>
            </label>

          </div>
        </Panel>

        {/* ── Status messages ───────────────────────────────────────────────── */}
        {submitMutation.isError && (
          <div style={{ ...errorStyle, fontWeight: 600, padding: '10px 14px' }}>
            {submitMutation.error?.response?.data?.detail || t('patient.report.submit_error')}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              border: '1px solid #6EE7B7',
              backgroundColor: '#D1FAE5',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#065F46',
              fontWeight: 600,
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* ── Submit footer (mirrors NewIncidentForm) ───────────────────────── */}
        <div
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            * {t('incidents.new.required_fields_note')}
          </div>
          <button
            type="submit"
            disabled={submitMutation.isPending || !facilityUuid}
            style={{
              border: 'none',
              borderRadius: 8,
              backgroundColor:
                submitMutation.isPending || !facilityUuid ? '#6B7280' : '#0B7D6B',
              color: '#FFFFFF',
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor:
                submitMutation.isPending || !facilityUuid ? 'not-allowed' : 'pointer',
              opacity: submitMutation.isPending || !facilityUuid ? 0.75 : 1,
              transition: 'background-color 0.15s, opacity 0.15s',
              letterSpacing: '0.01em',
            }}
          >
            {submitMutation.isPending
              ? `⏳ ${t('common.submitting')}`
              : `📤 ${t('patient.report.submit')}`}
          </button>
        </div>

      </form>
    </div>
  );
}