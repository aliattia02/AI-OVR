import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { incidentService } from '../../services/incidents';

const REPORTER_ROLE_OPTIONS = ['Patient', 'Visitor', 'Family Member'];

function resolveFacilityNameFromCascading(cascadingData, facilityUuid) {
  if (!cascadingData || typeof cascadingData !== 'object') return '';

  const byUuid = cascadingData.facility_by_uuid || cascadingData.facilities_by_uuid || cascadingData.by_uuid;
  if (byUuid && typeof byUuid === 'object' && byUuid[facilityUuid]) {
    return byUuid[facilityUuid];
  }

  const facilities = cascadingData.facilities;
  if (Array.isArray(facilities)) {
    const found = facilities.find(
      (entry) =>
        entry?.patient_link_uuid === facilityUuid || entry?.facility_uuid === facilityUuid || entry?.uuid === facilityUuid
    );
    return found?.facility_name || '';
  }

  if (facilities && typeof facilities === 'object') {
    const possible = facilities[facilityUuid];
    if (typeof possible === 'string') return possible;
    if (possible && typeof possible === 'object') return possible.facility_name || possible.name || '';
  }

  return '';
}

export default function PatientReportForm({ facilityUuid: facilityUuidProp }) {
  const { facility_uuid: facilityUuidFromParams } = useParams();
  const facilityUuid = facilityUuidProp || facilityUuidFromParams;
  const [facilityName, setFacilityName] = useState('');
  const [facilityLoadError, setFacilityLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      description: '',
      occurrence_date: '',
      occurrence_time: '',
      occurrence_location: '',
      reporter_role: 'Patient',
      medical_file_number: '',
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadFacilityName = async () => {
      if (!facilityUuid) {
        setFacilityLoadError('Invalid reporting link.');
        return;
      }

      try {
        setFacilityLoadError('');
        const { data } = await api.get('/facilities/cascading');
        if (!mounted) return;
        const name = resolveFacilityNameFromCascading(data, facilityUuid);
        setFacilityName(name || 'Reporting Facility');
      } catch (error) {
        if (!mounted) return;
        setFacilityName('Reporting Facility');
        setFacilityLoadError(error?.message || 'Unable to load facility details.');
      }
    };

    loadFacilityName();
    return () => {
      mounted = false;
    };
  }, [facilityUuid]);

  const submitMutation = useMutation({
    mutationFn: (payload) => incidentService.submitPatientReport(facilityUuid, payload),
    onSuccess: (result) => {
      setSuccessMessage(`Your report has been received. Reference: ${result?.incident_id || 'N/A'}`);
    },
  });

  const onSubmit = async (values) => {
    setSuccessMessage('');
    await submitMutation.mutateAsync({
      description: values.description,
      occurrence_date: values.occurrence_date || null,
      occurrence_time: values.occurrence_time || null,
      occurrence_location: values.occurrence_location || null,
      reporter_role: values.reporter_role,
      medical_file_number: values.medical_file_number || null,
    });
  };

  const fieldStyle = useMemo(
    () => ({
      width: '100%',
      minHeight: 46,
      border: '1px solid #D1D5DB',
      borderRadius: 10,
      padding: '12px 14px',
      fontSize: 16,
      color: '#111827',
      backgroundColor: '#FFFFFF',
      boxSizing: 'border-box',
    }),
    []
  );

  const labelStyle = { display: 'grid', gap: 6, fontSize: 14, fontWeight: 600, color: '#111827' };
  const errorStyle = { fontSize: 13, color: '#B91C1C' };

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '12px 12px 20px', display: 'grid', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 20, color: '#0C2340' }}>{facilityName || 'Reporting Facility'}</h2>

      <div
        style={{
          border: '1px solid #BFDBFE',
          backgroundColor: '#EFF6FF',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 14,
          color: '#1E3A8A',
        }}
      >
        Your report is anonymous. No personal information is required.
      </div>

      {facilityLoadError && <div style={errorStyle}>{facilityLoadError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 14 }}>
        <label style={{ ...labelStyle, fontSize: 16, fontWeight: 700 }}>
          Description
          <textarea
            rows={5}
            style={{ ...fieldStyle, resize: 'vertical', minHeight: 120 }}
            {...register('description', { required: 'Description is required' })}
          />
          {errors.description && <div style={errorStyle}>{errors.description.message}</div>}
        </label>

        <label style={labelStyle}>
          Occurrence Date
          <input type="date" style={fieldStyle} {...register('occurrence_date')} />
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
          Reporter Role
          <select style={fieldStyle} {...register('reporter_role')}>
            {REPORTER_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Medical File Number
          <input style={fieldStyle} {...register('medical_file_number')} />
        </label>

        {submitMutation.isError && (
          <div style={errorStyle}>{submitMutation.error?.response?.data?.detail || 'Failed to submit report.'}</div>
        )}

        {successMessage && (
          <div
            style={{
              border: '1px solid #86EFAC',
              backgroundColor: '#F0FDF4',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 14,
              color: '#166534',
              fontWeight: 600,
            }}
          >
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={submitMutation.isPending || !facilityUuid}
          style={{
            width: '100%',
            minHeight: 50,
            border: 'none',
            borderRadius: 10,
            backgroundColor: '#0B7D6B',
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 700,
            cursor: submitMutation.isPending || !facilityUuid ? 'not-allowed' : 'pointer',
            opacity: submitMutation.isPending || !facilityUuid ? 0.65 : 1,
          }}
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
