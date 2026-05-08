import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { incidentService } from '../../services/incidents';
import DisclaimerBanner from '../shared/DisclaimerBanner';

const REPORTER_ROLE_OPTIONS = ['Patient', 'Visitor', 'Family Member'];

export default function PatientReportForm({ facilityUuid: facilityUuidProp }) {
  const { facility_uuid: facilityUuidFromParams } = useParams();
  const facilityUuid = facilityUuidProp || facilityUuidFromParams;

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

    const loadFacilityInfo = async () => {
      if (!facilityUuid) {
        setFacilityLoadError('Invalid reporting link.');
        return;
      }

      try {
        setFacilityLoadError('');
        // Dedicated public endpoint — returns FacilitySafeResponse for this UUID
        const { data } = await api.get(`/patients/facility-info/${facilityUuid}`);
        if (!mounted) return;
        setFacilityInfo({
          facilityName: data.facility_name || 'Reporting Facility',
          administration: data.administration || '',
          governorate: data.governorate || '',
        });
      } catch (error) {
        if (!mounted) return;
        setFacilityInfo({ facilityName: 'Reporting Facility', administration: '', governorate: '' });
        setFacilityLoadError(
          error?.response?.status === 404
            ? 'Reporting link not recognised.'
            : (error?.message || 'Unable to load facility details.')
        );
      }
    };

    loadFacilityInfo();
    return () => { mounted = false; };
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

  const { facilityName, administration, governorate } = facilityInfo;
  const hasMeta = administration || governorate;

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '12px 12px 20px', display: 'grid', gap: 14 }}>

      {/* Facility identity card */}
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0C2340' }}>
          {facilityName || 'Reporting Facility'}
        </h2>

        {hasMeta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4 }}>
            {administration && (
              <span style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4ZM3 10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6ZM14 9a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-2Z" fill="#6B7280" />
                </svg>
                {administration}
              </span>
            )}
            {governorate && (
              <span style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.05 4.05a7 7 0 1 1 9.9 9.9L10 18.9l-4.95-4.95a7 7 0 0 1 0-9.9ZM10 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="#6B7280" />
                </svg>
                {governorate}
              </span>
            )}
          </div>
        )}
      </div>

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

      <DisclaimerBanner />

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