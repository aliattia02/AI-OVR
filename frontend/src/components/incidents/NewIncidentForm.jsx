/**
 * frontend/src/components/incidents/NewIncidentForm.jsx
 *
 * UI Enhancement: fields reorganised into collapsible panels matching the
 * IncidentDetail visual system — same Panel component, color tokens, grid
 * layouts, divider separators, and shared style objects.
 *
 * GAHAR migration changes:
 *   - SEVERITY_OPTIONS now includes 'Catastrophic' (from updated enums.js).
 *   - Probability field added as an optional pre-assessment field so staff can
 *     capture initial SAC likelihood at intake time.  Quality Admin can revise
 *     via the Risk Assessment panel in IncidentDetail.
 *
 * EN fields migration:
 *   - Cascading state now stores administrations_en and facilities_en from the
 *     /facilities/cascading response.
 *   - Administration and facility_name dropdowns display the English label
 *     (from _en maps) while the <option value> remains the Arabic canonical
 *     string — so the submitted payload is unchanged and the backend is unaffected.
 *   - facility_type_en is used for the locked display label on facility-level users.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCreateIncident } from '../../hooks/useIncidents';
import {
  ERROR_CLASSIFICATIONS,
  EVENT_DISCOVERY_METHODS,
  EVENT_TYPES,
  FACILITY_TYPES,
  HOSPITAL_LOCATION_OPTIONS,
  MEDICATION_ERROR_STAGES,
  NCC_MERP_CATEGORIES,
  OTHER_FACILITY_LOCATION_OPTIONS,
  PROBABILITY_OPTIONS,
  REPORTER_ROLES,
  SEVERITY_OPTIONS,
} from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';
import DisclaimerBanner from '../shared/DisclaimerBanner';
import { useDirection } from '../../hooks/useDirection'; // RTL

// ── Panel component (mirrors IncidentDetail's Panel) ──────────────────────────
function Panel({ title, icon, children, defaultOpen = true, step = null }) {
  return (
    <details open={defaultOpen} style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' }}>
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
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%',
              backgroundColor: '#0C2340', color: '#FFFFFF',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
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

// ── Section divider (mirrors IncidentDetail's divider helper) ─────────────────
function Divider({ label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#B0B8C4',
        textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
      }}>
        {icon}&nbsp;{label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#ECEEF1' }} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NewIncidentForm() {
  const { user } = useAuth();
  const { dir } = useDirection(); // RTL
  const { t } = useTranslation();

  // ── DB value translators ───────────────────────────────────────────────────
  const toI18nKey = (v) =>
    v
      .replace(/\s+/g, '_')
      .replace(/([A-Z])/g, (m, l, o, s) => (o > 0 && s[o - 1] !== '_' ? '_' : '') + l.toLowerCase())
      .replace(/__+/g, '_')
      .replace(/^_/, '');

  const translateGovernorate = (v) =>
    v ? t(`common.governorates.${v.toLowerCase()}`, { defaultValue: v.replace(/_/g, ' ') }) : v;

  const FACILITY_TYPE_KEY = { 'مستشفى': 'hospital', 'مركز': 'health_center', 'وحدة': 'health_unit' };
  const translateFacilityType = (v) => {
    if (!v) return v;
    const slug = FACILITY_TYPE_KEY[v];
    return slug ? t(`common.facility_types.${slug}`, { defaultValue: v }) : v;
  };

  const isFacilityUser = user?.role === 'staff' || user?.role === 'quality_admin';

  const {
    register,
    handleSubmit,
    watch,
    resetField,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      governorate:               isFacilityUser ? (user?.governorate    || '') : '',
      administration:            isFacilityUser ? (user?.administration  || '') : '',
      facility_name:             isFacilityUser ? (user?.facility_name   || '') : '',
      facility_type:             '',
      reporter_role:             '',
      involved_person:           '',
      occurrence_date:           '',
      occurrence_time:           '',
      occurrence_location:       '',
      responsible_manager:       '',
      reporting_department:      '',
      description:               '',
      error_classification:      '',
      specific_error:            '',
      event_type:                '',
      severity:                  '',
      probability:               '',
      recommendations:           '',
      notes:                     '',
      medical_file_number:       '',
      event_discovery_method:    '',
      medication_stage_of_error: '',
      medication_merp_category:  '',
    },
  });

  const createIncident = useCreateIncident();

  // ── Cascading state ────────────────────────────────────────────────────────
  const [cascading, setCascading] = useState({
    governorates:       [],
    administrations:    {},
    administrations_en: {},
    facilities:         {},
    facilities_en:      {},
    facility_types_en:  {},
  });
  const [cascadingError, setCascadingError] = useState('');
  const [aiNotice,       setAiNotice]       = useState('');

  const selectedGovernorate         = watch('governorate');
  const selectedAdministration      = watch('administration');
  const selectedFacilityType        = watch('facility_type');
  const selectedErrorClassification = watch('error_classification');
  const isMedicationSafety          = selectedErrorClassification === 'MedicationSafety';

  const administrationOptions = useMemo(
    () => (selectedGovernorate ? cascading.administrations?.[selectedGovernorate] || [] : []),
    [selectedGovernorate, cascading],
  );

  const facilityOptions = useMemo(
    () => (selectedAdministration ? cascading.facilities?.[selectedAdministration] || [] : []),
    [selectedAdministration, cascading],
  );

  const locationOptions = useMemo(
    () => selectedFacilityType === 'مستشفى'
      ? HOSPITAL_LOCATION_OPTIONS
      : OTHER_FACILITY_LOCATION_OPTIONS,
    [selectedFacilityType],
  );

  const getAdminLabel    = (gov, arAdmin) => cascading.administrations_en?.[gov]?.[arAdmin] || arAdmin;
  const getFacilityLabel = (arAdmin, arName) => cascading.facilities_en?.[arAdmin]?.[arName] || arName;

  useEffect(() => {
    let mounted = true;
    const loadCascading = async () => {
      try {
        setCascadingError('');
        const { data } = await api.get('/facilities/cascading');
        if (!mounted) return;
        setCascading({
          governorates:       Array.isArray(data?.governorates) ? data.governorates : [],
          administrations:    data?.administrations    && typeof data.administrations    === 'object' ? data.administrations    : {},
          administrations_en: data?.administrations_en && typeof data.administrations_en === 'object' ? data.administrations_en : {},
          facilities:         data?.facilities         && typeof data.facilities         === 'object' ? data.facilities         : {},
          facilities_en:      data?.facilities_en      && typeof data.facilities_en      === 'object' ? data.facilities_en      : {},
          facility_types_en:  data?.facility_types_en  && typeof data.facility_types_en  === 'object' ? data.facility_types_en  : {},
        });
      } catch (error) {
        if (!mounted) return;
        setCascadingError(error?.message || t('incidents.new.facility_options_error'));
      }
    };
    loadCascading();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isFacilityUser || !user?.facility_name) return;
    let mounted = true;
    api.get('/facilities/').then(({ data }) => {
      if (!mounted) return;
      const match = data.find((f) => f.facility_name === user.facility_name);
      if (match?.facility_type) setValue('facility_type', match.facility_type);
    }).catch(() => {/* non-critical */});
    return () => { mounted = false; };
  }, [isFacilityUser, user?.facility_name, setValue]);

  useEffect(() => {
    if (isFacilityUser) return;
    resetField('administration');
    resetField('facility_name');
  }, [selectedGovernorate, resetField, isFacilityUser]);

  useEffect(() => {
    if (isFacilityUser) return;
    resetField('facility_name');
  }, [selectedAdministration, resetField, isFacilityUser]);

  useEffect(() => {
    resetField('occurrence_location');
  }, [selectedFacilityType, resetField]);

  const onSubmit = async (values) => {
    setAiNotice('');
    const payload = {
      ...values,
      occurrence_time:           values.occurrence_time           || getCurrentTimeString(),
      occurrence_location:       values.occurrence_location       || 'Not specified',
      reporting_department:      values.reporting_department      || 'Not specified',
      responsible_manager:       values.responsible_manager       || null,
      recommendations:           values.recommendations           || null,
      notes:                     values.notes                     || null,
      specific_error:            values.specific_error            || null,
      medical_file_number:       values.medical_file_number       || null,
      probability:               values.probability               || null,
      event_discovery_method:    values.event_discovery_method    || null,
      medication_stage_of_error: values.medication_stage_of_error || null,
      medication_merp_category:  values.medication_merp_category  || null,
    };
    const result = await createIncident.mutateAsync(payload);
    if (
      result?.ai_metadata?.auto_classification !== null &&
      result?.ai_metadata?.auto_classification !== undefined
    ) {
      setAiNotice(
        t('incidents.ai.applied_notice', {
          classification: formatEnumLabel(result.ai_metadata.auto_classification),
        }),
      );
    }
  };

  // ── Shared style tokens (mirrors IncidentDetail) ───────────────────────────
  const fieldStyle = {
    width: '100%',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    boxSizing: 'border-box',
  };

  const lockedFieldStyle = {
    ...fieldStyle,
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    cursor: 'not-allowed',
  };

  const labelStyle = {
    display: 'grid',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    textAlign: 'start',
  };

  const errorStyle = {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'start',
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

  // ── LockedOrSelect helper (unchanged logic, updated styles) ────────────────
  const LockedOrSelect = ({ name, label, options, required, locked, displayValue, getOptionLabel }) => {
    if (locked) {
      const val = displayValue !== undefined ? displayValue : watch(name);
      return (
        <label style={labelStyle}>
          {label}
          <div style={{ position: 'relative' }}>
            <input
              style={lockedFieldStyle}
              value={val || ''}
              readOnly
              tabIndex={-1}
              {...register(name, required ? { required: `${label} ${t('common.is_required')}` } : {})}
            />
            <span style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF' }}>
              🔒
            </span>
          </div>
        </label>
      );
    }
    return (
      <label style={labelStyle}>
        {label}
        <select style={fieldStyle} {...register(name, required ? { required: `${label} ${t('common.is_required')}` } : {})}>
          <option value="">{t('incidents.new.select_label', { label: label.toLowerCase() })}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {getOptionLabel ? getOptionLabel(o) : o}
            </option>
          ))}
        </select>
        {errors[name] && <div style={errorStyle}>{errors[name].message}</div>}
      </label>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'grid', gap: 12 }}
      dir={dir}
    >

      {/* ── Form Header ─────────────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: '14px 16px',
        display: 'grid',
        gap: 4,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0C2340' }}>
          {t('incidents.new.title')}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          {t('incidents.new.subtitle')}
        </div>
      </div>

      {cascadingError && (
        <div style={{ ...errorStyle, fontWeight: 600, padding: '10px 14px' }}>
          {cascadingError}
        </div>
      )}

      <DisclaimerBanner />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Facility & Location
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.new.section_facility')}
        icon="🏥"
        step={1}
        defaultOpen={true}
      >
        <div style={{ display: 'grid', gap: 12 }}>

          {isFacilityUser ? (
            // ── Compressed read-only info strip (facility users cannot edit) ──
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                {[
                  {
                    label: t('incidents.detail.fields.governorate'),
                    value: translateGovernorate(user?.governorate),
                  },
                  {
                    label: t('incidents.detail.fields.administration'),
                    value: getAdminLabel(user?.governorate, user?.administration),
                  },
                  {
                    label: t('common.fields.facility'),
                    value: getFacilityLabel(user?.administration, user?.facility_name),
                  },
                  {
                    label: t('incidents.new.facility_type_label'),
                    value: translateFacilityType(watch('facility_type')),
                  },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    border: '1px solid #E2E8EF',
                    borderRadius: 10,
                    padding: '11px 14px',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <div style={{
                      fontSize: 11,
                      color: '#6B7280',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
                🔒 {t('incidents.new.facility_locked_hint')}
              </div>
            </>
          ) : (
            // ── Cascading selects for governorate / admin / manager roles ──
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <LockedOrSelect
                  name="governorate"
                  label={t('incidents.detail.fields.governorate')}
                  options={cascading.governorates}
                  required
                  locked={false}
                  getOptionLabel={translateGovernorate}
                />
                <LockedOrSelect
                  name="administration"
                  label={t('incidents.detail.fields.administration')}
                  options={administrationOptions}
                  required
                  locked={false}
                  getOptionLabel={(arAdmin) => getAdminLabel(selectedGovernorate, arAdmin)}
                />
              </div>

              <Divider label={t('incidents.new.divider_facility_info')} icon="🏢" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <LockedOrSelect
                  name="facility_name"
                  label={t('common.fields.facility')}
                  options={facilityOptions}
                  required
                  locked={false}
                  getOptionLabel={(arName) => getFacilityLabel(selectedAdministration, arName)}
                />
                <label style={labelStyle}>
                  {t('incidents.new.facility_type_label')}
                  <select
                    style={fieldStyle}
                    {...register('facility_type', { required: t('incidents.new.error_facility_type_required') })}
                  >
                    <option value="">{t('incidents.new.select_type')}</option>
                    {FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>{translateFacilityType(type) || type}</option>
                    ))}
                  </select>
                  {errors.facility_type && <div style={errorStyle}>{errors.facility_type.message}</div>}
                </label>
              </div>
            </>
          )}

        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Occurrence Details
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.new.section_occurrence')}
        icon="📅"
        step={2}
        defaultOpen={true}
      >
        <div style={{ display: 'grid', gap: 12 }}>

          {/* Date + Time — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.detail.fields.occurrence_date')} *
              <input
                type="date"
                style={fieldStyle}
                {...register('occurrence_date', { required: t('incidents.new.error_occurrence_date_required') })}
              />
              {errors.occurrence_date && <div style={errorStyle}>{errors.occurrence_date.message}</div>}
            </label>

            <label style={labelStyle}>
              {t('incidents.detail.fields.occurrence_time')}
              <input type="time" style={fieldStyle} {...register('occurrence_time')} />
            </label>
          </div>

          <Divider label={t('incidents.new.divider_where_how')} icon="📍" />

          {/* Location + Discovery Method — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.detail.fields.occurrence_location')}
              <select style={fieldStyle} {...register('occurrence_location')}>
                <option value="">{t('incidents.new.select_location_optional')}</option>
                {locationOptions.map((slug) => (
                  <option key={slug} value={slug}>
                    {t(`incidents.occurrence_location.${slug}`, { defaultValue: formatEnumLabel(slug) })}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {t('incidents.new.event_discovery_method_label')}
              <select style={fieldStyle} {...register('event_discovery_method')}>
                <option value="">{t('incidents.new.select_discovery_method_optional')}</option>
                {EVENT_DISCOVERY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`incidents.discovery_method.${m.toLowerCase()}`, { defaultValue: formatEnumLabel(m) })}
                  </option>
                ))}
              </select>
            </label>
          </div>

        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Reporter & People Involved
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.new.section_reporter')}
        icon="👤"
        step={3}
        defaultOpen={true}
      >
        <div style={{ display: 'grid', gap: 12 }}>

          {/* Reporter role + Involved person — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.new.reporter_role_label')} *
              <select style={fieldStyle} {...register('reporter_role', { required: t('incidents.new.error_reporter_role_required') })}>
                <option value="">{t('incidents.new.select_role')}</option>
                {REPORTER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`incidents.reporter_role.${toI18nKey(r)}`, { defaultValue: r })}
                  </option>
                ))}
              </select>
              {errors.reporter_role && <div style={errorStyle}>{errors.reporter_role.message}</div>}
            </label>

            <label style={labelStyle}>
              {t('incidents.new.involved_person_label')} *
              <input
                style={fieldStyle}
                {...register('involved_person', { required: t('incidents.new.error_involved_person_required') })}
              />
              {errors.involved_person && <div style={errorStyle}>{errors.involved_person.message}</div>}
            </label>
          </div>

          <Divider label={t('incidents.new.divider_department')} icon="🏷️" />

          {/* Responsible manager + Reporting department — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.new.responsible_manager_label')}
              <input style={fieldStyle} {...register('responsible_manager')} />
            </label>

            <label style={labelStyle}>
              {t('incidents.new.reporting_department_label')}
              <input style={fieldStyle} {...register('reporting_department')} />
            </label>
          </div>

        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Incident Description
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.detail.fields.description')}
        icon="📝"
        step={4}
        defaultOpen={true}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {t('incidents.new.description_hint')}
          </div>
          <label style={labelStyle}>
            <textarea
              rows={6}
              style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder={t('incidents.new.description_placeholder')}
              {...register('description', { required: t('incidents.new.error_description_required') })}
            />
            {errors.description && <div style={errorStyle}>{errors.description.message}</div>}
          </label>
        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — Classification & Risk Assessment
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.new.section_classification')}
        icon="🔍"
        step={5}
        defaultOpen={true}
      >
        <div style={{ display: 'grid', gap: 12 }}>

          {/* Error Classification + Specific Error — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.classification.label')} *
              <select
                style={fieldStyle}
                {...register('error_classification', { required: t('incidents.new.error_classification_required') })}
              >
                <option value="">{t('incidents.new.select_classification')}</option>
                {ERROR_CLASSIFICATIONS.map((classification, idx) => (
                  <option key={classification} value={classification}>
                    {idx + 1}. {t(`incidents.classification.${classification.toLowerCase()}`, { defaultValue: formatEnumLabel(classification) })}
                  </option>
                ))}
              </select>
              {errors.error_classification && <div style={errorStyle}>{errors.error_classification.message}</div>}
            </label>

            <label style={labelStyle}>
              {t('incidents.new.specific_error_label')}
              <input style={fieldStyle} {...register('specific_error')} />
            </label>
          </div>

          {/* ── Medication Safety sub-panel (conditional) ─────────────────── */}
          {isMedicationSafety && (
            <div style={{
              border: '1px solid #FCD34D',
              borderRadius: 10,
              backgroundColor: '#FFFBEB',
              padding: '14px 16px',
              display: 'grid',
              gap: 12,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                💊 {t('incidents.new.medication_safety_subtitle')}
              </div>

              {/* NCC MERP reference scale */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 3, minWidth: 480 }}>
                  {NCC_MERP_CATEGORIES.map((cat) => (
                    <div
                      key={cat.value}
                      style={{
                        flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700,
                        padding: '4px 2px', borderRadius: 6,
                        backgroundColor: {
                          safe: '#D1FAE5', near_miss: '#FEF3C7', harm: '#FEE2E2',
                          severe: '#F3E8FF', fatal: '#1F2937',
                        }[cat.severity],
                        color: cat.severity === 'fatal' ? '#FFFFFF' : '#374151',
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      <div>{cat.emoji}</div>
                      <div>{cat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage + MERP Category — 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <label style={labelStyle}>
                  {t('incidents.new.medication_stage_label')}
                  <select style={fieldStyle} {...register('medication_stage_of_error')}>
                    <option value="">— {t('incidents.new.select_stage_optional')} —</option>
                    {MEDICATION_ERROR_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {t(`incidents.medication_stage.${s.toLowerCase()}`, { defaultValue: s })}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  {t('incidents.new.merp_category_label')}
                  <select style={fieldStyle} {...register('medication_merp_category')}>
                    <option value="">— {t('incidents.new.select_merp_optional')} —</option>
                    {NCC_MERP_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {t(`incidents.merp_category.${cat.value.toLowerCase()}`, { defaultValue: `Category ${cat.value}` })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <Divider label={t('incidents.new.divider_risk')} icon="⚠️" />

          {/* Event Type — full width */}
          <label style={labelStyle}>
            {t('incidents.event_type.label')} *
            <select style={fieldStyle} {...register('event_type', { required: t('incidents.new.error_event_type_required') })}>
              <option value="">{t('incidents.new.select_event_type')}</option>
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {t(`incidents.event_type.${toI18nKey(eventType)}`, { defaultValue: formatEnumLabel(eventType) })}
                </option>
              ))}
            </select>
            {errors.event_type && <div style={errorStyle}>{errors.event_type.message}</div>}
          </label>

          {/* Severity + Probability — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={labelStyle}>
              {t('incidents.severity.label')} *
              <select style={fieldStyle} {...register('severity', { required: t('incidents.new.error_severity_required') })}>
                <option value="">{t('incidents.new.select_severity')}</option>
                {SEVERITY_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {t(`incidents.severity.${severity.toLowerCase()}`)}
                  </option>
                ))}
              </select>
              {errors.severity && <div style={errorStyle}>{errors.severity.message}</div>}
            </label>

            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('incidents.detail.fields.probability')}
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>
                  ({t('common.optional')})
                </span>
              </span>
              <select style={fieldStyle} {...register('probability')}>
                <option value="">{t('incidents.new.select_probability_optional')}</option>
                {PROBABILITY_OPTIONS.map((prob) => (
                  <option key={prob} value={prob}>
                    {t(`incidents.probability.${prob.toLowerCase()}`)}
                  </option>
                ))}
              </select>
              <div style={hintStyle}>{t('incidents.new.probability_hint')}</div>
            </label>
          </div>

        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — Additional Information
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel
        title={t('incidents.new.section_additional')}
        icon="📋"
        step={6}
        defaultOpen={false}
      >
        <div style={{ display: 'grid', gap: 12 }}>

          <label style={labelStyle}>
            {t('incidents.new.recommendations_label')}
            <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} {...register('recommendations')} />
          </label>

          <label style={labelStyle}>
            {t('incidents.new.notes_label')}
            <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} {...register('notes')} />
          </label>

          <Divider label={t('incidents.new.divider_patient')} icon="🗂️" />

          <label style={labelStyle}>
            {t('incidents.detail.fields.medical_file_number')}
            <input style={fieldStyle} {...register('medical_file_number')} />
            <div style={hintStyle}>🔒 {t('incidents.new.stored_encrypted')}</div>
          </label>

        </div>
      </Panel>

      {/* ── Status messages ────────────────────────────────────────────────── */}
      {createIncident.isError && (
        <div style={{
          ...errorStyle,
          padding: '10px 14px',
          fontWeight: 600,
        }}>
          {createIncident.error?.response?.data?.detail || t('incidents.new.error_submit')}
        </div>
      )}

      {createIncident.isSuccess && (
        <div style={{
          border: '1px solid #6EE7B7',
          backgroundColor: '#D1FAE5',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          color: '#065F46',
          fontWeight: 600,
        }}>
          ✅ {t('incidents.new.success_submit')}
        </div>
      )}

      {aiNotice && (
        <div style={{
          border: '1px solid #99F6E4',
          backgroundColor: '#F0FDFA',
          color: '#0F766E',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 600,
        }}>
          🤖 {aiNotice}
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          * {t('incidents.new.required_fields_note')}
        </div>
        <button
          type="submit"
          disabled={createIncident.isPending}
          style={{
            border: 'none',
            borderRadius: 8,
            backgroundColor: createIncident.isPending ? '#6B7280' : '#0B7D6B',
            color: '#FFFFFF',
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: createIncident.isPending ? 'not-allowed' : 'pointer',
            opacity: createIncident.isPending ? 0.75 : 1,
            transition: 'background-color 0.15s, opacity 0.15s',
            letterSpacing: '0.01em',
          }}
        >
          {createIncident.isPending
            ? `⏳ ${t('common.submitting')}`
            : `📤 ${t('incidents.new.submit')}`}
        </button>
      </div>

    </form>
  );
}