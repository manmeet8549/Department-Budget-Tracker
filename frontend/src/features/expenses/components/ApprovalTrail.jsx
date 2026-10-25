import StatusBadge from '../../../components/StatusBadge';

export default function ApprovalTrail({ approvals = [] }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--dp-color-ink-primary)' }}>
        Approval Trail
      </h4>
      {approvals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {approvals.map((appr) => (
            <div
              key={appr.id || `${appr.stepNo}-${appr.decidedOn}`}
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-bg)',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>
                  Step #{appr.stepNo}: {appr.approver?.name} ({appr.approver?.role})
                </span>
                <StatusBadge status={appr.decision} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
                {new Date(appr.decidedOn).toLocaleString()}
              </div>
              {appr.remark && (
                <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--dp-color-ink-primary)' }}>
                  “{appr.remark}”
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)', fontStyle: 'italic' }}>
          No approval actions recorded yet.
        </div>
      )}
    </div>
  );
}
