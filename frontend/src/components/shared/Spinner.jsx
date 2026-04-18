export default function Spinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: 32,
        height: 32,
        border: '3px solid #e5e7eb',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
      }}
    />
  );
}
