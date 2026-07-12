// frontend/src/components/analytics/DashboardFilterBar.jsx
//
// Compact, always-visible filter bar for the dashboard metrics panel.
// Filter dimensions: Governorate · Administration · Facility Type · Facility Name · Creation Date · Occurrence Date
//
// Facility options are loaded from the public /facilities/cascading endpoint
// (no auth required) so the dropdown stays in sync with the database.
// Cascade chain: Governorate → Administration → Facility Name.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { ERROR_CLASSIFICATIONS } from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';

// ── Design tokens (match the rest of the app) ─────────────────────────────────
const C = {
  brand:      '#0B7D6B',
  brandLight: '#E6F4F1',
  brandMid:   '#096358',
  text:       '#111827',
  textMid:    '#374151',
  textMuted:  '#6B7280',
  border:     '#E5E7EB',
  bg:         '#FFFFFF',
  bgAlt:      '#F9FAFB',
  yellow:     '#D97706',
  shadow:     '0 1px 3px rgba(0,0,0,0.08)',
};

// ── Data hook ─────────────────────────────────────────────────────────────────

function useCascadingFacilities() {
  return useQuery({
    queryKey: ['facilities', 'cascading'],
    queryFn: async () => {
      const { data } = await api.get('/facilities/cascading');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 min — facilities rarely change
    retry: 1,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const selectStyle = (hasValue, isRtl) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: isRtl ? '7px 10px 7px 28px' : '7px 28px 7px 10px',
  fontSize: 13,
  color: hasValue ? C.text : C.textMuted,
  backgroundColor: C.bg,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  width: '100%',
  textAlign: isRtl ? 'right' : 'left',
  direction: isRtl ? 'rtl' : 'ltr',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: isRtl ? 'left 9px center' : 'right 9px center',
  transition: 'border-color 0.15s',
  minWidth: 0,
});

const dateInputStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: '7px 10px',
  fontSize: 12,
  color: C.text,
  backgroundColor: C.bg,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  minWidth: 0,
};

function FilterLabel({ children }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: C.textMuted,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <FilterLabel>{label}</FilterLabel>
      {children}
    </div>
  );
}

function DateRange({ label, from, to, onFromChange, onToChange, fromLabel, toLabel }) {
  return (
    <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <FilterLabel>{label}</FilterLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <input
          type="date"
          value={from}
          onChange={e => onFromChange(e.target.value)}
          title={fromLabel}
          style={dateInputStyle}
          onFocus={e => { e.target.style.borderColor = C.brand; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <input
          type="date"
          value={to}
          onChange={e => onToChange(e.target.value)}
          title={toLabel}
          style={dateInputStyle}
          onFocus={e => { e.target.style.borderColor = C.brand; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMuted }}>
        <span>{fromLabel}</span><span>{toLabel}</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * DashboardFilterBar
 *
 * @param {Object}   props.filters        Current filter values (controlled).
 * @param {Function} props.onFiltersChange Called with the new filters object on any change.
 * @param {boolean}  [props.isLoading]    When true, shows a subtle loading pulse on the bar.
 */
export default function DashboardFilterBar({ filters, onFiltersChange, isLoading = false, lockedFacilityName = null, lockedGovernorate = null, lockedAdministration = null }) {
  const { data: cascading, isLoading: cascadingLoading } = useCascadingFacilities();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // ── EN label helpers ──────────────────────────────────────────────────────
  //
  // administrations_en shape: { [gov]: { [ar_admin]: en_admin } }
  // Flatten into a single { ar_admin: en_admin } lookup.
  const adminEnMap = useMemo(() => {
    const m = {};
    for (const govMap of Object.values(cascading?.administrations_en ?? {})) {
      Object.assign(m, govMap);
    }
    return m;
  }, [cascading]);

  // facilities_en shape: { [ar_admin]: { [ar_name]: en_name } }
  // Flatten into a single { ar_name: en_name } lookup.
  const facilityEnMap = useMemo(() => {
    const m = {};
    for (const nameMap of Object.values(cascading?.facilities_en ?? {})) {
      Object.assign(m, nameMap);
    }
    return m;
  }, [cascading]);

  // facility_types_en shape: { [ar_type]: en_type }
  const facilityTypesEn = cascading?.facility_types_en ?? {};

  // ── Derived option lists ───────────────────────────────────────────────────
  //
  // get_cascading_options() returns this exact shape (facility_service.py):
  //
  //   governorates:   string[]                      — flat list
  //   administrations: { [governorate]: string[] }  — gov  → admin names
  //   facilities:      { [administration]: string[] }— admin → facility names
  //
  // To go from governorate → facility names we must do a two-step join:
  //   1. administrations[governorate] → list of admin names for that gov
  //   2. For each admin name, facilities[admin] → list of facility names
  //
  // When no governorate is selected we flatten every admin bucket.

  const governorateOptions = useMemo(() => {
    return [...(cascading?.governorates || [])].sort();
  }, [cascading]);

  // Administrations cascade from the selected governorate.
  // When no governorate is selected, all administrations are shown.
  const administrationOptions = useMemo(() => {
    const administrations = cascading?.administrations ?? {};
    const admins = filters.governorate
      ? (administrations[filters.governorate] ?? [])
      : Object.values(administrations).flat();
    return [...new Set(admins)].sort();
  }, [cascading, filters.governorate]);

  // Facility names cascade from the selected administration (or governorate when
  // no administration is chosen). Three-step chain:
  //   governorate → administrations[gov] → facilities[admin] → names
  const facilityNameOptions = useMemo(() => {
    const administrations = cascading?.administrations ?? {};
    const facilities      = cascading?.facilities      ?? {};

    let targetAdmins;
    if (filters.administration) {
      // Specific admin selected — only its facilities
      targetAdmins = [filters.administration];
    } else if (filters.governorate) {
      // Governorate selected but no admin — all admins in that gov
      targetAdmins = administrations[filters.governorate] ?? [];
    } else {
      // No location filter — all admins
      targetAdmins = Object.values(administrations).flat();
    }

    const names = targetAdmins.flatMap(admin => facilities[admin] ?? []);
    return [...new Set(names)].sort();
  }, [cascading, filters.governorate, filters.administration]);

  // Facility types come from the database via the cascading endpoint.
  const facilityTypeOptions = useMemo(() => {
    return [...(cascading?.facility_types || [])].sort();
  }, [cascading]);

  // ── Change handlers ────────────────────────────────────────────────────────

  const set = useCallback((key, value) => {
    const next = { ...filters, [key]: value };
    // Cascade resets: changing a parent clears all its children
    if (key === 'governorate' && value !== filters.governorate) {
      next.administration = '';
      next.facility_name  = '';
    }
    if (key === 'administration' && value !== filters.administration) {
      next.facility_name = '';
    }
    onFiltersChange(next);
  }, [filters, onFiltersChange]);

  const clearAll = useCallback(() => {
    onFiltersChange({
      governorate:          '',
      administration:       '',
      facility_type:        '',
      facility_name:        '',
      creation_from:        '',
      creation_to:          '',
      occurrence_from:      '',
      occurrence_to:        '',
      error_classification: '',
    });
  }, [onFiltersChange]);

  // ── Active filter count ────────────────────────────────────────────────────

  const activeCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== '' && v != null).length;
  }, [filters]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      backgroundColor: C.bg,
      padding: '14px 18px',
      boxShadow: C.shadow,
      opacity: isLoading ? 0.7 : 1,
      transition: 'opacity 0.2s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          {t('analytics.filters.title')}
        </span>
        {activeCount > 0 && (
          <span style={{
            backgroundColor: C.brand,
            color: '#fff',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            padding: '1px 7px',
            lineHeight: 1.7,
          }}>
            {t('analytics.filters.active_count', { count: activeCount })}
          </span>
        )}
        {isLoading && (
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>{t('analytics.filters.updating')}</span>
        )}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: C.brand,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 5,
            }}
          >
            {t('analytics.filters.clear_all')}
          </button>
        )}
      </div>

      {/* Filter grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px 14px',
        alignItems: 'end',
      }}>

        {/* Governorate — locked for governorate managers */}
        <FilterGroup label={t('common.fields.governorate')}>
          {lockedGovernorate !== null ? (
            <div style={{
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              padding: '7px 10px',
              fontSize: 13,
              color: C.textMid,
              backgroundColor: C.bgAlt,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}>
              <span style={{
                fontSize: 10,
                backgroundColor: C.brandLight,
                color: C.brand,
                borderRadius: 4,
                padding: '1px 5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {t('analytics.filters.your_governorate', { defaultValue: 'Your governorate' })}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAr ? lockedGovernorate : t(`common.governorates.${lockedGovernorate.toLowerCase()}`, lockedGovernorate.replace(/_/g, ' '))}
              </span>
            </div>
          ) : (
            <select
              value={filters.governorate}
              onChange={e => set('governorate', e.target.value)}
              disabled={cascadingLoading}
              style={selectStyle(!!filters.governorate, isAr)}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            >
              <option value="">{t('analytics.filters.all_governorates')}</option>
              {governorateOptions.map(g => (
                <option key={g} value={g}>{t(`common.governorates.${g.toLowerCase()}`, g.replace(/_/g, ' '))}</option>
              ))}
            </select>
          )}
        </FilterGroup>

        {/* Administration — cascades from Governorate, locked for administration managers */}
        <FilterGroup label={t('common.fields.administration')}>
          {lockedAdministration !== null ? (
            <div style={{
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              padding: '7px 10px',
              fontSize: 13,
              color: C.textMid,
              backgroundColor: C.bgAlt,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}>
              <span style={{
                fontSize: 10,
                backgroundColor: C.brandLight,
                color: C.brand,
                borderRadius: 4,
                padding: '1px 5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {t('analytics.filters.your_administration', { defaultValue: 'Your administration' })}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAr ? lockedAdministration : (adminEnMap[lockedAdministration] || lockedAdministration)}
              </span>
            </div>
          ) : (
            <select
              value={filters.administration}
              onChange={e => set('administration', e.target.value)}
              disabled={cascadingLoading || administrationOptions.length === 0}
              style={selectStyle(!!filters.administration, isAr)}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            >
              <option value="">{t('analytics.filters.all_administrations')}</option>
              {administrationOptions.map(a => (
                // value = Arabic canonical (what the backend filters on)
                // label = English from administrations_en, falls back to Arabic
                <option key={a} value={a}>{isAr ? a : (adminEnMap[a] || a)}</option>
              ))}
            </select>
          )}
        </FilterGroup>

        {/* Facility Type — sourced from database via cascading endpoint */}
        <FilterGroup label={t('common.fields.facility_type')}>
          <select
            value={filters.facility_type}
            onChange={e => set('facility_type', e.target.value)}
            disabled={cascadingLoading || facilityTypeOptions.length === 0}
            style={selectStyle(!!filters.facility_type, isAr)}
            onFocus={e => { e.target.style.borderColor = C.brand; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          >
            <option value="">{t('analytics.filters.all_types')}</option>
            {facilityTypeOptions.map(ft => (
              // value = Arabic type (مستشفى/مركز/وحدة); label = English from facility_types_en
              <option key={ft} value={ft}>{isAr ? ft : (facilityTypesEn[ft] || ft)}</option>
            ))}
          </select>
        </FilterGroup>

        {/* Facility Name — locked for tier-2 users, cascades from Governorate for others */}
        <FilterGroup label={t('common.fields.facility_name')}>
          {lockedFacilityName !== null ? (
            <div style={{
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              padding: '7px 10px',
              fontSize: 13,
              color: C.textMid,
              backgroundColor: C.bgAlt,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}>
              <span style={{
                fontSize: 10,
                backgroundColor: C.brandLight,
                color: C.brand,
                borderRadius: 4,
                padding: '1px 5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {t('analytics.filters.your_facility')}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lockedFacilityName}
              </span>
            </div>
          ) : (
            <select
              value={filters.facility_name}
              onChange={e => set('facility_name', e.target.value)}
              disabled={cascadingLoading || facilityNameOptions.length === 0}
              style={selectStyle(!!filters.facility_name, isAr)}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            >
              <option value="">
                {facilityNameOptions.length === 0 && !cascadingLoading
                  ? t('analytics.filters.no_facilities')
                  : t('analytics.filters.all_facilities')}
              </option>
              {facilityNameOptions.map(name => (
                // value = Arabic canonical; label = English from facilities_en
                <option key={name} value={name}>{isAr ? name : (facilityEnMap[name] || name)}</option>
              ))}
            </select>
          )}
        </FilterGroup>

        {/* Creation Date range */}
        <DateRange
          label={t('common.fields.creation_date')}
          from={filters.creation_from}
          to={filters.creation_to}
          onFromChange={v => set('creation_from', v)}
          onToChange={v => set('creation_to', v)}
          fromLabel={t('common.from')}
          toLabel={t('common.to')}
        />

        {/* Occurrence Date range */}
        <DateRange
          label={t('common.fields.occurrence_date')}
          from={filters.occurrence_from}
          to={filters.occurrence_to}
          onFromChange={v => set('occurrence_from', v)}
          onToChange={v => set('occurrence_to', v)}
          fromLabel={t('common.from')}
          toLabel={t('common.to')}
        />

        {/* Error Classification — mirrors ERROR_CLASSIFICATIONS in enums.js */}
        <FilterGroup label={t('incidents.classification.label')}>
          <select
            value={filters.error_classification ?? ''}
            onChange={e => set('error_classification', e.target.value)}
            style={selectStyle(!!filters.error_classification, isAr)}
            onFocus={e => { e.target.style.borderColor = C.brand; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          >
            <option value="">{t('analytics.filters.all_classifications')}</option>
            {ERROR_CLASSIFICATIONS.map((cls, idx) => (
              <option key={cls} value={cls}>
                {idx + 1}. {t(
                  `incidents.classification.${cls.toLowerCase()}`,
                  { defaultValue: formatEnumLabel(cls) }
                )}
              </option>
            ))}
          </select>
        </FilterGroup>

      </div>
    </div>
  );
}