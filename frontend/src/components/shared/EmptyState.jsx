export default function EmptyState({ icon = '📋', title, subtitle, action }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '32px 20px',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 10,
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 36, lineHeight: 1 }}>
        {icon}
      </div>
      <h3 style={{ margin: 0, color: '#0C2340', fontSize: 20, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: 0, color: '#1F2937', fontSize: 14 }}>{subtitle}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: 6,
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#0B7D6B',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
