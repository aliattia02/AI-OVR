export const INCIDENT_STATUSES = {
  Created: { label: 'Created', color: '#1B6CA8', bg: '#E8F2FB' },
  InProgress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  Evaluating: { label: 'Evaluating', color: '#6D28D9', bg: '#EDE9FE' },
  MoreInfoNeeded: { label: 'More Info Needed', color: '#DC2626', bg: '#FEE2E2' },
  ActionTaken: { label: 'Action Taken', color: '#0B7D6B', bg: '#E0F5F1' },
  Completed: { label: 'Completed', color: '#059669', bg: '#D1FAE5' },
};

export const SEVERITY_OPTIONS = ['Minor', 'Moderate', 'Major'];
export const PROBABILITY_OPTIONS = ['Low', 'Medium', 'High'];
export const ERROR_CLASSIFICATIONS = [
  'Medication',
  'Administrative',
  'Clinical',
  'Equipment',
  'InfectionControl',
  'Falls',
  'Documentation',
  'Behavior',
];
export const EVENT_TYPES = [
  'IncidentEvent',
  'NearMiss',
  'AdverseEvent',
  'SignificantEvent',
  'SentinelEvent',
];
export const ACTION_STATUSES = ['Pending', 'InProgress', 'Completed'];
export const REPORTER_ROLES = [
  'Patient',
  'Staff/Doctor',
  'Staff/Nurse',
  'Staff/Pharmacist',
  'Staff/Other',
  'Visitor',
];
export const FACILITY_TYPES = ['مستشفى', 'مركز', 'وحدة'];

export const USER_ROLES = {
  patient: { label: 'Patient', tier: 1 },
  staff: { label: 'Staff', tier: 2 },
  quality_admin: { label: 'Quality Admin', tier: 2 },
  administration_manager: { label: 'Administration Manager', tier: 3 },
  governorate_manager: { label: 'Governorate Manager', tier: 4 },
  top_management: { label: 'Top Management', tier: 5 },
};

export const GOVERNORATES = ['Aswan', 'Ismailia', 'Luxor', 'Port_Said', 'South_Sinai', 'Suez'];
export const GOV_LABELS = {
  Aswan: 'أسوان',
  Ismailia: 'الإسماعيلية',
  Luxor: 'الأقصر',
  Port_Said: 'بورسعيد',
  South_Sinai: 'جنوب سيناء',
  Suez: 'السويس',
};
