export const authCases = [
  'restores session via /auth/me when access token is valid',
  'refreshes token on 401 from /auth/me and retries request once',
  'clears token and redirects to /login when refresh fails',
];

export const incidentWorkflowCases = [
  'sends new_status payload key for PATCH /incidents/:id/status',
  'allows legal status transitions and blocks illegal transitions in UI flow',
];

export const patientSubmitCases = [
  'submits to /patients/submit/:uuid with anonymous payload',
  'renders success message with incident_id and no internal fields',
];
