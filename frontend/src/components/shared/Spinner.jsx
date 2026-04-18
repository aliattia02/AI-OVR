export default function Spinner() {
  return (
    <svg
      role="status"
      aria-live="polite"
      viewBox="0 0 50 50"
      style={{
        width: 32,
        height: 32,
        display: 'block',
      }}
    >
      <circle cx="25" cy="25" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <path d="M25 5a20 20 0 0 1 20 20" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
