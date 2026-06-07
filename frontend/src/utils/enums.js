/**
 * frontend/src/utils/enums.js
 *
 * Frontend enum constants — mirrors backend app/utils/enums.py.
 * Arrays drive <select> dropdowns; keyed objects drive badge/role display.
 *
 * Occurrence-location update:
 *   Added HOSPITAL_LOCATION_OPTIONS and OTHER_FACILITY_LOCATION_OPTIONS
 *   to power the facility-type-aware location dropdown in NewIncidentForm.
 *   Slugs are persisted to the DB; labels come from incidents.occurrence_location.*
 *   in the i18n translation files.
 */

// ── Incident Status — keyed object ────────────────────────────────────────────
// StatusBadge uses INCIDENT_STATUSES[status] → { label, color, bg }.
// Colors match STATUS_PILL in IncidentDetail.jsx for visual consistency.
export const INCIDENT_STATUSES = {
  Created:        { label: 'Created',          color: '#374151', bg: '#F3F4F6' },
  InProgress:     { label: 'In Progress',      color: '#1E40AF', bg: '#DBEAFE' },
  Evaluating:     { label: 'Evaluating',       color: '#92400E', bg: '#FEF3C7' },
  MoreInfoNeeded: { label: 'More Info Needed', color: '#B45309', bg: '#FEF3C7' },
  ActionTaken:    { label: 'Action Taken',     color: '#5B21B6', bg: '#EDE9FE' },
  Completed:      { label: 'Completed',        color: '#065F46', bg: '#D1FAE5' },
};

// ── User Roles — keyed object ─────────────────────────────────────────────────
// Sidebar uses USER_ROLES[role] → { label, tier }.
// Mirrors UserRole in enums.py; tiers reflect access-control hierarchy.
export const USER_ROLES = {
  patient:                { label: 'Patient',                tier: 1 },
  staff:                  { label: 'Staff',                  tier: 2 },
  quality_admin:          { label: 'Quality Admin',          tier: 3 },
  administration_manager: { label: 'Administration Manager', tier: 4 },
  governorate_manager:    { label: 'Governorate Manager',    tier: 4 },
  top_management:         { label: 'Top Management',         tier: 5 },
};

// ── Error Classification ──────────────────────────────────────────────────────
// Mirrors ErrorClassification in enums.py (14-category consolidated taxonomy)
export const ERROR_CLASSIFICATIONS = [
  'PatientSafety',
  'MedicationSafety',
  'InfectionPrevention',
  'BloodTransfusion',
  'Laboratory',
  'RadiologyDiagnostic',
  'MedicalEquipment',
  'FacilityEnvironmental',
  'OccupationalHealthStaff',
  'Security',
  'InformationTechnology',
  'AdministrativeProcess',
  'PatientExperienceComplaints',
  'FireDisaster',
];

// ── Event Type ────────────────────────────────────────────────────────────────
// Mirrors EventType in enums.py
export const EVENT_TYPES = [
  'IncidentEvent',
  'NearMiss',
  'AdverseEvent',
  'SignificantEvent',
  'SentinelEvent',
];

// ── Severity ──────────────────────────────────────────────────────────────────
// Mirrors Severity in enums.py (GAHAR SAC 4-level scale, highest → lowest)
export const SEVERITY_OPTIONS = [
  'Catastrophic',
  'Major',
  'Moderate',
  'Minor',
];

// ── Probability ───────────────────────────────────────────────────────────────
// Mirrors Probability in enums.py (GAHAR SAC 4-level scale, most → least likely)
export const PROBABILITY_OPTIONS = [
  'Frequent',
  'Occasional',
  'Uncommon',
  'Remote',
];

// ── Action Status ─────────────────────────────────────────────────────────────
// Mirrors ActionStatus in enums.py
export const ACTION_STATUSES = [
  'Pending',
  'InProgress',
  'Completed',
];

// ── Facility Types ────────────────────────────────────────────────────────────
// DB stores Arabic canonical values — mirrors FacilityType in enums.py.
// Use FACILITY_TYPE_EN (in enums.py) or the i18n key common.facility_types.*
// for display; never change these values or existing documents will break.
export const FACILITY_TYPES = [
  'مستشفى', // Hospital
  'مركز',   // Health Center
  'وحدة',   // Health Unit
];

// ── Reporter Roles ────────────────────────────────────────────────────────────
// Clinical and operational roles available to staff reporters.
export const REPORTER_ROLES = [
  'Nurse',
  'Physician',
  'Pharmacist',
  'Lab Technician',
  'Radiology Technician',
  'Administrative Staff',
  'Other',
];

// ── Event Discovery Methods ───────────────────────────────────────────────────
// Mirrors EventDiscoveryMethod in enums.py
export const EVENT_DISCOVERY_METHODS = [
  'SelfReported',
  'SupervisorReported',
  'PatientComplaint',
  'AuditFinding',
  'IncidentInvestigation',
  'Other',
];

// ── Medication Error Stages ───────────────────────────────────────────────────
// Mirrors MedicationErrorStage in enums.py
export const MEDICATION_ERROR_STAGES = [
  'Prescribing',
  'Transcribing',
  'Dispensing',
  'Preparation',
  'Administration',
  'Monitoring',
];

// ── NCC MERP Categories ───────────────────────────────────────────────────────
// Mirrors NCCMERPCategory in enums.py (A–I), enriched with display metadata.
// `severity` drives the colour bands in the reference bar and GAHAR panel.
export const NCC_MERP_CATEGORIES = [
  { value: 'A', emoji: '🟢', severity: 'safe' },      // No error occurred
  { value: 'B', emoji: '🟡', severity: 'near_miss' }, // Did not reach patient
  { value: 'C', emoji: '🟡', severity: 'near_miss' }, // Reached patient, no harm
  { value: 'D', emoji: '🟠', severity: 'near_miss' }, // Monitoring required
  { value: 'E', emoji: '🔴', severity: 'harm' },      // Temporary harm
  { value: 'F', emoji: '🔴', severity: 'harm' },      // Hospitalisation
  { value: 'G', emoji: '🟣', severity: 'severe' },    // Permanent harm
  { value: 'H', emoji: '🟣', severity: 'severe' },    // Life-sustaining intervention
  { value: 'I', emoji: '⚫', severity: 'fatal' },     // Patient death
];

// ── Occurrence Location — Facility-type-aware ─────────────────────────────────
// NewIncidentForm picks the right list based on watch('facility_type'):
//   'مستشفى' (Hospital)  → HOSPITAL_LOCATION_OPTIONS
//   'مركز' / 'وحدة'      → OTHER_FACILITY_LOCATION_OPTIONS
//
// Slugs are stored in the DB as-is and translated in the UI via:
//   t(`incidents.occurrence_location.${slug}`, { defaultValue: formatEnumLabel(slug) })
//
// Both lists share telehealth_remote and administrative_area so they always appear
// regardless of facility type.

export const HOSPITAL_LOCATION_OPTIONS = [
  'emergency_room',
  'icu',
  'operating_room',
  'recovery_room',
  'inpatient_ward',
  'outpatient_clinic',
  'radiology',
  'laboratory',
  'pharmacy',
  'maternity_ward',
  'pediatric_ward',
  'cardiac_care',
  'corridor',
  'administrative_area',
  'telehealth_remote',
];

export const OTHER_FACILITY_LOCATION_OPTIONS = [
  'examination_room',
  'treatment_room',
  'waiting_area',
  'reception',
  'nursing_station',
  'patient_room',
  'procedure_room',
  'administrative_area',
  'telehealth_remote',
];