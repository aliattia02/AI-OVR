import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useCreateIncident } from '../../hooks/useIncidents';
import {
  ERROR_CLASSIFICATIONS,
  EVENT_TYPES,
  FACILITY_TYPES,
  REPORTER_ROLES,
  SEVERITY_OPTIONS,
} from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';

function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function NewIncidentForm() {
  const {
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { errors },
  } = useForm({
    defaultValues: {
      governorate: '',
      administration: '',
      facility_name: '',
      facility_type: '',
      reporter_role: '',
      involved_person: '',
      occurrence_date: '',
      occurrence_time: '',
      occurrence_location: '',
      responsible_manager: '',
      reporting_department: '',
      description: '',
      error_classification: '',
      specific_error: '',
      event_type: '',
      severity: '',
      recommendations: '',
      notes: '',
      medical_file_number: '',
    },
  });

  const createIncident = useCreateIncident();
  const [cascading, setCascading] = useState({ governorates: [], administrations: {}, facilities: {} });
  const [cascadingError, setCascadingError] = useState('');
  const [aiNotice, setAiNotice] = useState('');

  const selectedGovernorate = watch('governorate');
  const selectedAdministration = watch('administration');

  const administrationOptions = useMemo(
    () => (selectedGovernorate ? cascading.administrations?.[selectedGovernorate] || [] : []),
    [selectedGovernorate, cascading]
  );

  const facilityOptions = useMemo(
    () => (selectedAdministration ? cascading.facilities?.[selectedAdministration] || [] : []),
    [selectedAdministration, cascading]
  );

  useEffect(() => {
    let mounted = true;

    const loadCascading = async () => {
      try {
        setCascadingError('');
        const { data } = await api.get('/facilities/cascading');
        if (!mounted) return;
        setCascading({
          governorates: Array.isArray(data?.governorates) ? data.governorates : [],
          administrations: data?.administrations && typeof data.administrations === 'object' ? data.administrations : {},
          facilities: data?.facilities && typeof data.facilities === 'object' ? data.facilities : {},
        });
      } catch (error) {
        if (!mounted) return;
        setCascadingError(error?.message || 'Failed to load facility options.');
      }
    };

    loadCascading();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    resetField('administration');
    resetField('facility_name');
  }, [selectedGovernorate, resetField]);

  useEffect(() => {
    resetField('facility_name');
  }, [selectedAdministration, resetField]);

  const onSubmit = async (values) => {
    setAiNotice('');

    const payload = {
      ...values,
      occurrence_time: values.occurrence_time || getCurrentTimeString(),
      occurrence_location: values.occurrence_location || 'Not specified',
      reporting_department: values.reporting_department || 'Not specified',
      responsible_manager: values.responsible_manager || null,
      recommendations: values.recommendations || null,
      notes: values.notes || null,
      specific_error: values.specific_error || null,
      medical_file_number: values.medical_file_number || null,
    };

    const result = await createIncident.mutateAsync(payload);

    if (result?.ai_metadata?.auto_classification != null) {
      setAiNotice(
        `AI Classification Applied: ${formatEnumLabel(result.ai_metadata.auto_classification)} — pending Quality Admin review.`
      );
    }
  };

  const fieldStyle = {
    width: '100%',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#111827' };
  const errorStyle = { fontSize: 12, color: '#B91C1C' };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 14 }}>
      {cascadingError && <div style={{ ...errorStyle, fontWeight: 600 }}>{cascadingError}</div>}

      <label style={labelStyle}>
        Governorate
        <select style={fieldStyle} {...register('governorate', { required: 'Governorate is required' })}>
          <option value="">Select governorate</option>
          {cascading.governorates.map((gov) => (
            <option key={gov} value={gov}>
              {gov}
            </option>
          ))}
        </select>
        {errors.governorate && <div style={errorStyle}>{errors.governorate.message}</div>}
      </label>

      <label style={labelStyle}>
        Administration
        <select style={fieldStyle} {...register('administration', { required: 'Administration is required' })}>
          <option value="">Select administration</option>
          {administrationOptions.map((admin) => (
            <option key={admin} value={admin}>
              {admin}
            </option>
          ))}
        </select>
        {errors.administration && <div style={errorStyle}>{errors.administration.message}</div>}
      </label>

      <label style={labelStyle}>
        Facility
        <select style={fieldStyle} {...register('facility_name', { required: 'Facility is required' })}>
          <option value="">Select facility</option>
          {facilityOptions.map((facility) => (
            <option key={facility} value={facility}>
              {facility}
            </option>
          ))}
        </select>
        {errors.facility_name && <div style={errorStyle}>{errors.facility_name.message}</div>}
      </label>

      <label style={labelStyle}>
        Facility Type
        <select style={fieldStyle} {...register('facility_type', { required: 'Facility type is required' })}>
          <option value="">Select type</option>
          {FACILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.facility_type && <div style={errorStyle}>{errors.facility_type.message}</div>}
      </label>

      <label style={labelStyle}>
        Reporter Role
        <select style={fieldStyle} {...register('reporter_role', { required: 'Reporter role is required' })}>
          <option value="">Select role</option>
          {REPORTER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {errors.reporter_role && <div style={errorStyle}>{errors.reporter_role.message}</div>}
      </label>

      <label style={labelStyle}>
        Involved Person
        <input style={fieldStyle} {...register('involved_person', { required: 'Involved person is required' })} />
        {errors.involved_person && <div style={errorStyle}>{errors.involved_person.message}</div>}
      </label>

      <label style={labelStyle}>
        Occurrence Date
        <input type="date" style={fieldStyle} {...register('occurrence_date', { required: 'Occurrence date is required' })} />
        {errors.occurrence_date && <div style={errorStyle}>{errors.occurrence_date.message}</div>}
      </label>

      <label style={labelStyle}>
        Occurrence Time
        <input type="time" style={fieldStyle} {...register('occurrence_time')} />
      </label>

      <label style={labelStyle}>
        Occurrence Location
        <input style={fieldStyle} {...register('occurrence_location')} />
      </label>

      <label style={labelStyle}>
        Responsible Manager
        <input style={fieldStyle} {...register('responsible_manager')} />
      </label>

      <label style={labelStyle}>
        Reporting Department
        <input style={fieldStyle} {...register('reporting_department')} />
      </label>

      <label style={{ ...labelStyle, fontSize: 15, fontWeight: 700 }}>
        Description
        <textarea
          rows={5}
          style={{ ...fieldStyle, resize: 'vertical' }}
          {...register('description', { required: 'Description is required' })}
        />
        {errors.description && <div style={errorStyle}>{errors.description.message}</div>}
      </label>

      <label style={labelStyle}>
        Error Classification
        <select
          style={fieldStyle}
          {...register('error_classification', { required: 'Error classification is required' })}
        >
          <option value="">Select classification</option>
          {ERROR_CLASSIFICATIONS.map((classification) => (
            <option key={classification} value={classification}>
              {formatEnumLabel(classification)}
            </option>
          ))}
        </select>
        {errors.error_classification && <div style={errorStyle}>{errors.error_classification.message}</div>}
      </label>

      <label style={labelStyle}>
        Specific Error
        <input style={fieldStyle} {...register('specific_error')} />
      </label>

      <label style={labelStyle}>
        Event Type
        <select style={fieldStyle} {...register('event_type', { required: 'Event type is required' })}>
          <option value="">Select event type</option>
          {EVENT_TYPES.map((eventType) => (
            <option key={eventType} value={eventType}>
              {formatEnumLabel(eventType)}
            </option>
          ))}
        </select>
        {errors.event_type && <div style={errorStyle}>{errors.event_type.message}</div>}
      </label>

      <label style={labelStyle}>
        Severity
        <select style={fieldStyle} {...register('severity', { required: 'Severity is required' })}>
          <option value="">Select severity</option>
          {SEVERITY_OPTIONS.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
        {errors.severity && <div style={errorStyle}>{errors.severity.message}</div>}
      </label>

      <label style={labelStyle}>
        Recommendations
        <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical' }} {...register('recommendations')} />
      </label>

      <label style={labelStyle}>
        Notes
        <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical' }} {...register('notes')} />
      </label>

      <label style={labelStyle}>
        Medical File Number
        <input style={fieldStyle} {...register('medical_file_number')} />
        <div style={{ fontSize: 12, color: '#4B5563' }}>Stored encrypted</div>
      </label>

      {createIncident.isError && (
        <div style={errorStyle}>{createIncident.error?.response?.data?.detail || 'Failed to submit incident.'}</div>
      )}

      {createIncident.isSuccess && (
        <div style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>Incident submitted successfully.</div>
      )}

      {aiNotice && (
        <div
          style={{
            border: '1px solid #99F6E4',
            backgroundColor: '#F0FDFA',
            color: '#0F766E',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {aiNotice}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={createIncident.isPending}
          style={{
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#0B7D6B',
            color: '#FFFFFF',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: createIncident.isPending ? 'not-allowed' : 'pointer',
            opacity: createIncident.isPending ? 0.7 : 1,
          }}
        >
          {createIncident.isPending ? 'Submitting...' : 'Submit Incident'}
        </button>
      </div>
    </form>
  );
}
