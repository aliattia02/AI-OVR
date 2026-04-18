const SIZE_MAP = {
  sm: 20,
  md: 32,
  lg: 44,
};

export default function Spinner({ size = 'md' }) {
  const dimension = SIZE_MAP[size] ?? SIZE_MAP['md'];

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        role="status"
        aria-live="polite"
        aria-label="Loading"
        viewBox="0 0 50 50"
        style={{
          width: dimension,
          height: dimension,
          display: 'block',
        }}
      >
        <circle cx="25" cy="25" r="20" fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <path d="M25 5a20 20 0 0 1 20 20" fill="none" stroke="#0B7D6B" strokeWidth="4" strokeLinecap="round">
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
    </div>
  );
}
