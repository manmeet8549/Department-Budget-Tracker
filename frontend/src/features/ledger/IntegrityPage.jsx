import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Lock,
  Layers,
  Database,
  Clock,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import { formatDate } from '../../utils/dates.js';
import {
  getLedgerStatus,
  listLedgerBlocks,
  anchorPendingEntries,
  retryLedgerBlock,
  verifyLedgerIntegrity,
  getLedgerProof,
} from '../../api/ledger.js';

export default function IntegrityPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canAnchor = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT';

  const [status, setStatus] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Anchor modal state
  const [anchorModalOpen, setAnchorModalOpen] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorResult, setAnchorResult] = useState(null);

  // Proof search state
  const [proofInputId, setProofInputId] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [proofError, setProofError] = useState(null);

  // Copy-to-clipboard state
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, blocksRes] = await Promise.all([
        getLedgerStatus(),
        listLedgerBlocks({ page: 1, limit: 20 }),
      ]);
      setStatus(statusRes);
      setBlocks(blocksRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyLedgerIntegrity();
      setVerificationResult(res);
      // Reload status to update last verification
      const updatedStatus = await getLedgerStatus();
      setStatus(updatedStatus);
    } catch (err) {
      setVerificationResult({
        ok: false,
        summary: {
          blocks: [],
          issues: [err?.response?.data?.error?.message || err.message || 'Verification execution failed'],
        },
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleAnchorConfirm = async () => {
    setAnchoring(true);
    setAnchorResult(null);
    try {
      const res = await anchorPendingEntries();
      setAnchorResult(res);
      await loadData();
    } catch (err) {
      setAnchorResult({
        created: false,
        error: err?.response?.data?.error?.message || err.message || 'Anchoring failed',
      });
    } finally {
      setAnchoring(false);
    }
  };

  const handleRetryBlock = async (blockId) => {
    try {
      await retryLedgerBlock(blockId);
      await loadData();
    } catch (err) {
      alert(`Retry failed: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const handleProofSearch = async (e) => {
    e.preventDefault();
    if (!proofInputId.trim()) return;

    setProofLoading(true);
    setProofData(null);
    setProofError(null);

    try {
      const res = await getLedgerProof(proofInputId.trim());
      setProofData(res);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Proof not found';
      setProofError(msg);
    } finally {
      setProofLoading(false);
    }
  };

  const truncateHash = (hash, prefixLen = 8, suffixLen = 6) => {
    if (!hash || typeof hash !== 'string') return '—';
    if (hash.length <= prefixLen + suffixLen + 2) return hash;
    return `${hash.slice(0, prefixLen)}…${hash.slice(-suffixLen)}`;
  };

  const formatChainName = (raw) => {
    if (!raw) return 'Disabled';
    if (raw === 'local') return 'Hardhat Local (Chain 31337)';
    if (raw === 'sepolia') return 'Ethereum Sepolia Testnet';
    if (raw === 'amoy') return 'Polygon Amoy Testnet';
    return raw.toUpperCase();
  };

  const totalProtectedEntries = blocks.reduce((sum, b) => sum + (b.entryCount || 0), 0);

  const blockColumns = [
    {
      header: 'Block #',
      accessor: 'blockNo',
      render: (row) => (
        <span style={{ fontWeight: '700', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
          #{row.blockNo}
        </span>
      ),
    },
    {
      header: 'Audit Entries',
      accessor: 'entryCount',
      isNumeric: true,
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '500' }}>
          {row.entryCount} {row.entryCount === 1 ? 'entry' : 'entries'}
        </span>
      ),
    },
    {
      header: 'Merkle Root',
      accessor: 'merkleRoot',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <code
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              backgroundColor: 'var(--dp-color-ground-muted)',
              padding: '2px 6px',
              borderRadius: 'var(--dp-radius-xs)',
              border: '1px solid var(--dp-color-rule)',
            }}
          >
            {truncateHash(row.merkleRoot, 6, 6)}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(row.merkleRoot, `root-${row.id}`)}
            title="Copy Merkle root"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: copiedKey === `root-${row.id}` ? 'var(--dp-color-status-anchored)' : 'var(--dp-color-ink-muted)',
            }}
          >
            {copiedKey === `root-${row.id}` ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      ),
    },
    {
      header: 'Tx Hash',
      accessor: 'txHash',
      render: (row) => {
        if (!row.txHash) return <span style={{ color: 'var(--dp-color-ink-muted)' }}>—</span>;
        const explorerUrl = status?.explorerBaseUrl ? `${status.explorerBaseUrl}/tx/${row.txHash}` : null;

        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <code
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: 'var(--dp-color-ground-muted)',
                padding: '2px 6px',
                borderRadius: 'var(--dp-radius-xs)',
                border: '1px solid var(--dp-color-rule)',
              }}
            >
              {truncateHash(row.txHash, 6, 6)}
            </code>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                title="View on block explorer"
                style={{ color: 'var(--dp-color-accent)', display: 'inline-flex' }}
              >
                <ExternalLink size={14} />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => copyToClipboard(row.txHash, `tx-${row.id}`)}
                title="Copy transaction hash"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: copiedKey === `tx-${row.id}` ? 'var(--dp-color-status-anchored)' : 'var(--dp-color-ink-muted)',
                }}
              >
                {copiedKey === `tx-${row.id}` ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} label={row.status} size="sm" />,
    },
    {
      header: 'Anchored Date',
      accessor: 'anchoredAt',
      render: (row) => (
        <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          {formatDate(row.anchoredAt || row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: (row) => {
        if (isSuperAdmin && (row.status === 'FAILED' || row.status === 'PENDING')) {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRetryBlock(row.id)}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Retry
            </Button>
          );
        }
        return <span style={{ color: 'var(--dp-color-ink-muted)', fontSize: '12px' }}>Locked</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dp-spacing-grid-gap)' }}>
      {/* ── Page Title Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '800',
              letterSpacing: 'var(--dp-tracking-tight)',
              color: 'var(--dp-color-ink)',
            }}
          >
            <span className="sr-only">Blockchain Integrity & Audit Ledger</span>
            <span aria-hidden="true">
              Blockchain <span className="dp-title-accent">Integrity</span> & Witness
            </span>
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              color: 'var(--dp-color-ink-secondary)',
              fontSize: 'var(--dp-typography-body)',
              maxWidth: '65ch',
            }}
          >
            Tamper-evident verification of financial audit logs via cryptographic Merkle trees anchored to smart contracts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={handleVerify}
            loading={verifying}
            disabled={loading || verifying}
            id="btn-verify-integrity"
          >
            <ShieldCheck size={16} style={{ marginRight: '6px' }} />
            Verify Integrity
          </Button>

          {canAnchor && (
            <Button
              variant="primary"
              onClick={() => {
                setAnchorResult(null);
                setAnchorModalOpen(true);
              }}
              disabled={loading}
              id="btn-open-anchor-modal"
            >
              <Layers size={16} style={{ marginRight: '6px' }} />
              Anchor Now
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--dp-radius-md)',
            backgroundColor: 'var(--dp-color-status-failed-bg)',
            color: 'var(--dp-color-status-failed)',
            border: '1px solid var(--dp-color-status-failed-border)',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Chain Header Card ────────────────────────────────────────────── */}
      <Card style={{ padding: '20px 24px', backgroundColor: 'var(--dp-color-panel)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--dp-radius-md)',
                background: 'var(--dp-gradient-tile)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--dp-shadow-glow)',
                flexShrink: 0,
              }}
            >
              <LinkIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                  {formatChainName(status?.chain)}
                </span>
                {status?.isTestnet && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 8px',
                      borderRadius: 'var(--dp-radius-pill)',
                      backgroundColor: 'var(--dp-color-status-submitted-bg)',
                      color: 'var(--dp-color-status-submitted)',
                      border: '1px solid var(--dp-color-status-submitted-border)',
                    }}
                  >
                    Test network
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
                  Smart Contract:
                </span>
                <code
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--dp-color-ground-muted)',
                    padding: '2px 8px',
                    borderRadius: 'var(--dp-radius-xs)',
                    color: 'var(--dp-color-ink)',
                    border: '1px solid var(--dp-color-rule)',
                  }}
                >
                  {status?.contractAddress ? truncateHash(status.contractAddress, 10, 8) : 'Not deployed'}
                </code>
                {status?.contractAddress && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(status.contractAddress, 'contract-addr')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: copiedKey === 'contract-addr' ? 'var(--dp-color-status-anchored)' : 'var(--dp-color-ink-muted)',
                    }}
                    title="Copy contract address"
                  >
                    {copiedKey === 'contract-addr' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {status?.explorerBaseUrl && status?.contractAddress && (
            <a
              href={`${status.explorerBaseUrl}/address/${status.contractAddress}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--dp-color-accent)',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              View on Explorer <ExternalLink size={14} />
            </a>
          )}
        </div>
      </Card>

      {/* ── Stat Cards Row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--dp-spacing-grid-gap)',
        }}
      >
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dp-color-ink-secondary)', fontSize: '13px', fontWeight: '600' }}>
            <Layers size={16} /> Blocks Anchored
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
            {status?.lastBlock?.blockNo ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '4px' }}>
            Total append-only blocks on-chain
          </div>
        </Card>

        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dp-color-ink-secondary)', fontSize: '13px', fontWeight: '600' }}>
            <Database size={16} /> Entries Protected
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
            {totalProtectedEntries}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '4px' }}>
            Audit records fingerprinted in Merkle trees
          </div>
        </Card>

        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dp-color-ink-secondary)', fontSize: '13px', fontWeight: '600' }}>
            <RefreshCw size={16} /> Pending Entries
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
            {status?.unanchoredCount ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '4px' }}>
            Awaiting next settlement anchor batch
          </div>
        </Card>

        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dp-color-ink-secondary)', fontSize: '13px', fontWeight: '600' }}>
            <Clock size={16} /> Last Anchored
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '12px', color: 'var(--dp-color-ink)' }}>
            {status?.lastBlock?.anchoredAt ? formatDate(status.lastBlock.anchoredAt) : 'Never'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '4px' }}>
            {status?.lastBlock ? `Block #${status.lastBlock.blockNo}` : 'No blocks yet'}
          </div>
        </Card>
      </div>

      {/* ── Verification Result Banner (Conditional) ───────────────────── */}
      {verificationResult && (
        <div
          role="alert"
          id="verification-result-panel"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--dp-radius-lg)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            backgroundColor: verificationResult.ok
              ? 'var(--dp-color-status-anchored-bg)'
              : 'var(--dp-color-status-failed-bg)',
            border: `1px solid ${
              verificationResult.ok
                ? 'var(--dp-color-status-anchored-border)'
                : 'var(--dp-color-status-failed-border)'
            }`,
          }}
        >
          {verificationResult.ok ? (
            <ShieldCheck size={24} style={{ color: 'var(--dp-color-status-anchored)', flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <ShieldAlert size={24} style={{ color: 'var(--dp-color-status-failed)', flexShrink: 0, marginTop: '2px' }} />
          )}

          <div style={{ flex: 1 }}>
            <h4
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '700',
                color: verificationResult.ok
                  ? 'var(--dp-color-status-anchored)'
                  : 'var(--dp-color-status-failed)',
              }}
            >
              {verificationResult.ok ? 'Audit Trail Intact & Verified' : 'Cryptographic Tampering Detected'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)', lineHeight: 1.5 }}>
              {verificationResult.ok
                ? 'All database audit records match their cryptographic Merkle roots and on-chain witnesses. No modifications or deletions have occurred.'
                : 'One or more database records or hash chain links do not match the on-chain smart contract witness. Details below:'}
            </p>

            {!verificationResult.ok && verificationResult.summary?.blocks && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {verificationResult.summary.blocks
                  .filter((b) => b.status !== 'OK')
                  .map((b) => (
                    <div
                      key={b.blockNo}
                      style={{
                        fontSize: '12px',
                        backgroundColor: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: 'var(--dp-radius-md)',
                        border: '1px solid var(--dp-color-status-failed-border)',
                      }}
                    >
                      <strong>Block #{b.blockNo}:</strong> Status: <code>{b.status}</code>
                      {b.issues?.length > 0 && <span> — {b.issues.join('; ')}</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Anchored Blocks Table ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              letterSpacing: 'var(--dp-tracking-tight)',
              color: 'var(--dp-color-ink)',
            }}
          >
            Anchored Ledger Blocks
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
            Showing {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>

        <DataTable
          columns={blockColumns}
          data={blocks}
          loading={loading}
          emptyMessage="No blocks anchored yet. Unsettled audit entries will be anchored during the next scheduled batch."
          id="ledger-blocks-table"
        />
      </div>

      {/* ── Merkle Proof Lookup Card ────────────────────────────────────── */}
      <Card style={{ padding: '24px' }}>
        <h3
          style={{
            margin: '0 0 6px 0',
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: 'var(--dp-tracking-tight)',
            color: 'var(--dp-color-ink)',
          }}
        >
          Audit Entry Inclusion Proof
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          Enter any Audit Log Entry ID to retrieve and verify its individual Merkle cryptographic path against the on-chain root.
        </p>

        <form onSubmit={handleProofSearch} style={{ display: 'flex', gap: '12px', maxWidth: '480px' }}>
          <input
            type="number"
            min="1"
            placeholder="e.g. 42"
            value={proofInputId}
            onChange={(e) => setProofInputId(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--dp-radius-md)',
              border: '1px solid var(--dp-color-rule)',
              fontSize: '14px',
              backgroundColor: 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
            }}
            id="input-proof-audit-id"
          />
          <Button type="submit" variant="secondary" loading={proofLoading} disabled={proofLoading || !proofInputId.trim()}>
            <Search size={15} style={{ marginRight: '6px' }} />
            Lookup Proof
          </Button>
        </form>

        {proofError && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--dp-radius-md)',
              backgroundColor: 'var(--dp-color-status-failed-bg)',
              color: 'var(--dp-color-status-failed)',
              border: '1px solid var(--dp-color-status-failed-border)',
              fontSize: '13px',
            }}
          >
            {proofError}
          </div>
        )}

        {proofData && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--dp-radius-md)',
              backgroundColor: 'var(--dp-color-ground-muted)',
              border: '1px solid var(--dp-color-rule)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                Audit Entry #{proofData.auditEntryId} (Block #{proofData.blockNo})
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--dp-color-status-anchored)',
                  fontWeight: '600',
                  fontSize: '12px',
                }}
              >
                <ShieldCheck size={14} /> Cryptographically Included
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Leaf Hash: </span>
              <code style={{ fontSize: '12px', color: 'var(--dp-color-ink)' }}>{proofData.leafHash}</code>
            </div>

            <div>
              <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Merkle Root: </span>
              <code style={{ fontSize: '12px', color: 'var(--dp-color-ink)' }}>{proofData.merkleRoot}</code>
            </div>

            <div>
              <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Proof Depth: </span>
              <span>{proofData.proof?.length || 0} sibling hash steps</span>
            </div>

            {proofData.txHash && (
              <div>
                <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Anchored Tx: </span>
                <code style={{ fontSize: '12px', color: 'var(--dp-color-ink)' }}>{proofData.txHash}</code>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Plain-Language Educational Trust Notice ─────────────────────── */}
      <Card
        style={{
          padding: '20px 24px',
          backgroundColor: 'var(--dp-color-ground-muted)',
          border: '1px dashed var(--dp-color-rule)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <Lock size={20} style={{ color: 'var(--dp-color-accent)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
              Institutional Privacy &amp; Tamper Resistance
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)', lineHeight: 1.5 }}>
              Only fingerprints (cryptographic SHA-256 hashes) are stored on the blockchain. No names, amounts, or internal justifications are published on-chain. The PostgreSQL database remains the system's operational source of truth; the decentralized smart contract acts as an immutable witness.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Anchor Confirmation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={anchorModalOpen}
        onClose={() => setAnchorModalOpen(false)}
        title="Anchor Audit Trail to Blockchain"
        subtitle="Batch settled audit records into a Merkle root and submit to smart contract"
        maxWidth="500px"
        id="modal-anchor-pending"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setAnchorModalOpen(false)} disabled={anchoring}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAnchorConfirm} loading={anchoring} disabled={anchoring}>
              Confirm &amp; Anchor
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', color: 'var(--dp-color-ink-secondary)' }}>
          <p style={{ margin: 0 }}>
            This action will compile all settled audit log entries into a binary Merkle tree, calculate the new block hash, and write the root to the connected smart contract:
          </p>

          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--dp-radius-md)',
              backgroundColor: 'var(--dp-color-ground-muted)',
              border: '1px solid var(--dp-color-rule)',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div><strong>Network:</strong> {formatChainName(status?.chain)}</div>
            <div><strong>Contract:</strong> {truncateHash(status?.contractAddress, 10, 8)}</div>
            <div><strong>Pending entries:</strong> {status?.unanchoredCount ?? 0} candidate rows</div>
          </div>

          {anchorResult && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--dp-radius-md)',
                backgroundColor: anchorResult.created
                  ? 'var(--dp-color-status-anchored-bg)'
                  : 'var(--dp-color-status-failed-bg)',
                color: anchorResult.created
                  ? 'var(--dp-color-status-anchored)'
                  : 'var(--dp-color-status-failed)',
                border: `1px solid ${
                  anchorResult.created
                    ? 'var(--dp-color-status-anchored-border)'
                    : 'var(--dp-color-status-failed-border)'
                }`,
                fontSize: '13px',
              }}
            >
              {anchorResult.created
                ? `Successfully created and anchored Block #${anchorResult.block?.blockNo}!`
                : anchorResult.reason === 'NO_ENTRIES'
                ? 'No settled entries were ready for anchoring.'
                : anchorResult.error || anchorResult.message || 'Anchoring failed.'}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
