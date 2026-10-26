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
      <Card style={{ borderLeft: '4px solid var(--dp-color-accent)', boxShadow: 'var(--dp-shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dp-color-accent)' }}>
                College Budget Ceiling
              </span>
              <span style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', fontWeight: '500' }}>
                (FY {activeFy.year})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '32px', marginTop: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.03em' }}>
                  Institutional Ceiling
                </div>
                <div id="ceiling-amount" className="numeric" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--dp-color-ink)' }}>
                  {loading ? '...' : ceilingData?.ceiling ? formatINR(ceilingData.ceiling) : 'Not Set'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.03em' }}>
                  Approved Total
                </div>
                <div id="ceiling-approved-total" className="numeric" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--dp-color-status-approved)' }}>
                  {loading ? '...' : formatINR(ceilingData?.approvedTotal || 0)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.03em' }}>
                  Remaining Headroom
                </div>
                <div id="ceiling-remaining" className="numeric" style={{ fontSize: '20px', fontWeight: '800', color: ceilingData?.remaining ? 'var(--dp-color-ink)' : 'var(--dp-color-ink-secondary)' }}>
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
            onCeilingChanged?.();
          }}
        />
      )}
    </>
  );
}
