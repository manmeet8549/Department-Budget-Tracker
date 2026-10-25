import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/Card.jsx';
import Button from '../../../components/Button.jsx';
import { formatINR } from '../../../utils/currency.js';
import { getCollegeCeiling } from '../../../api/budgets.js';
import CeilingModal from './CeilingModal.jsx';

export default function CeilingPanel({ user, activeFy, onCeilingChanged }) {
  const [ceilingData, setCeilingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canManage = user?.role === 'MANAGEMENT';
  const canView = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user?.role);

  const fetchCeiling = useCallback(async () => {
    if (!activeFy?.id || !canView) return;
    try {
      setLoading(true);
      const data = await getCollegeCeiling(activeFy.id);
      setCeilingData(data);
    } catch {
      setCeilingData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFy?.id, canView]);

  useEffect(() => {
    fetchCeiling();
  }, [fetchCeiling]);

  if (!canView || !activeFy) return null;

  return (
    <>
      <Card style={{ borderLeft: '4px solid var(--dp-color-accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--dp-color-accent)' }}>
                College Budget Ceiling
              </span>
              <span style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
                (FY {activeFy.year})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '28px', marginTop: '10px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                  Institutional Ceiling
                </div>
                <div id="ceiling-amount" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                  {loading ? '...' : ceilingData?.ceiling ? formatINR(ceilingData.ceiling) : 'Not Set'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                  Approved Total
                </div>
                <div id="ceiling-approved-total" style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>
                  {loading ? '...' : formatINR(ceilingData?.approvedTotal || 0)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                  Remaining Headroom
                </div>
                <div id="ceiling-remaining" style={{ fontSize: '18px', fontWeight: '700', color: ceilingData?.remaining ? 'var(--dp-color-ink)' : 'var(--dp-color-ink-secondary)' }}>
                  {loading ? '...' : ceilingData?.remaining ? formatINR(ceilingData.remaining) : '— (No Ceiling)'}
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <div>
              <Button
                id="btn-open-set-ceiling"
                size="sm"
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
              >
                {ceilingData?.ceiling ? 'Edit Ceiling' : 'Set Ceiling'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {isModalOpen && (
        <CeilingModal
          financialYear={activeFy}
          currentCeiling={ceilingData}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(updated) => {
            setCeilingData(updated);
            if (onCeilingChanged) onCeilingChanged(updated);
          }}
        />
      )}
    </>
  );
}
