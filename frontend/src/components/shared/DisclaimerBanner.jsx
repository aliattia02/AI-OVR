export const DisclaimerBanner = ({ className = '' }) => {
  return (
    <div
      className={className}
      style={{
        border: '1px solid #b5d4f4',
        background: '#e6f1fb',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#0c447c',
      }}
    >
      <span>يستخدم فقط لأغراض تحسين الجودة وليس كوثيقة قانونية. هوية المبلغ محمية.</span>
      <br />
      <span>
        This report is used exclusively for quality improvement — not for legal proceedings.
        Reporter identity is protected.
      </span>
    </div>
  );
};

export default DisclaimerBanner;
