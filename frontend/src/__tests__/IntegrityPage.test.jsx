import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import IntegrityPage from '../features/ledger/IntegrityPage.jsx';
import AppLayout from '../components/AppLayout.jsx';
import * as authContext from '../features/auth/AuthContext.jsx';
import * as ledgerApi from '../api/ledger.js';
import { BrowserRouter } from 'react-router-dom';

describe('Iteration L: IntegrityPage & Blockchain Witness UI', () => {
  const mockStatus = {
    chain: 'local',
    isTestnet: true,
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    explorerBaseUrl: null,
    lastBlock: {
      id: 1,
      blockNo: 1,
      merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockHash: '0x1111222233334444111122223333444411112222333344441111222233334444',
      entryCount: 5,
      status: 'ANCHORED',
      txHash: '0x9999888877776666999988887777666699998888777766669999888877776666',
      anchoredAt: '2026-10-26T12:00:00.000Z',
      createdAt: '2026-10-26T11:59:00.000Z',
    },
    unanchoredCount: 3,
    lastVerification: {
      id: 1,
      ok: true,
      summary: {},
      createdAt: '2026-10-26T12:05:00.000Z',
      runBy: 'Super Admin',
    },
  };

  const mockBlocks = [
    {
      id: 1,
      blockNo: 1,
      prevBlockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockHash: '0x1111222233334444111122223333444411112222333344441111222233334444',
      entryCount: 5,
      status: 'ANCHORED',
      txHash: '0x9999888877776666999988887777666699998888777766669999888877776666',
      anchoredAt: '2026-10-26T12:00:00.000Z',
      createdAt: '2026-10-26T11:59:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'SUPER_ADMIN', name: 'Super Admin' },
      logout: vi.fn(),
    });

    vi.spyOn(ledgerApi, 'getLedgerStatus').mockResolvedValue(mockStatus);
    vi.spyOn(ledgerApi, 'listLedgerBlocks').mockResolvedValue({
      data: mockBlocks,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('renders page header, connected chain card with test network badge, and contract address', async () => {
    render(<IntegrityPage />);

    expect(await screen.findAllByText(/Blockchain/)).not.toHaveLength(0);
    expect(screen.getByText(/Hardhat Local \(Chain 31337\)/)).toBeInTheDocument();
    expect(screen.getByText('Test network')).toBeInTheDocument();
    expect(screen.getByText(/0x5FbDB231/i)).toBeInTheDocument();
  });

  it('displays the 4 statistical summary cards with accurate metrics', async () => {
    render(<IntegrityPage />);

    expect(await screen.findByText('Blocks Anchored')).toBeInTheDocument();
    expect(screen.getByText('Entries Protected')).toBeInTheDocument();
    expect(screen.getByText('Pending Entries')).toBeInTheDocument();
    expect(screen.getByText('Last Anchored')).toBeInTheDocument();

    // Metric values
    expect(screen.getByText('1')).toBeInTheDocument(); // blockNo
    expect(screen.getByText('5')).toBeInTheDocument(); // entries protected
    expect(screen.getByText('3')).toBeInTheDocument(); // pending entries
    expect(screen.getAllByText('26 Oct 2026').length).toBeGreaterThan(0); // last anchored via formatDate
  });

  it('renders the blocks table with status badge and copyable roots', async () => {
    render(<IntegrityPage />);

    expect(await screen.findByText('#1')).toBeInTheDocument();
    expect(screen.getByText('5 entries')).toBeInTheDocument();
    expect(screen.getByText('ANCHORED')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('handles "Verify Integrity" click and displays green intact banner on success', async () => {
    vi.spyOn(ledgerApi, 'verifyLedgerIntegrity').mockResolvedValue({
      verificationId: 10,
      ok: true,
      summary: { blocks: [{ blockNo: 1, status: 'OK', issues: [] }] },
    });

    render(<IntegrityPage />);
    const verifyBtn = await screen.findByRole('button', { name: /Verify Integrity/i });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText('Audit Trail Intact & Verified')).toBeInTheDocument();
    expect(
      screen.getByText(/All database audit records match their cryptographic Merkle roots/i)
    ).toBeInTheDocument();
  });

  it('handles "Verify Integrity" click and displays red warning banner on tampering', async () => {
    vi.spyOn(ledgerApi, 'verifyLedgerIntegrity').mockResolvedValue({
      verificationId: 11,
      ok: false,
      summary: {
        blocks: [{ blockNo: 1, status: 'AUDIT_MODIFIED', issues: ['Modified audit entries: 42'] }],
      },
    });

    render(<IntegrityPage />);
    const verifyBtn = await screen.findByRole('button', { name: /Verify Integrity/i });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText('Cryptographic Tampering Detected')).toBeInTheDocument();
    expect(screen.getByText(/Modified audit entries: 42/)).toBeInTheDocument();
  });

  it('opens confirmation modal on "Anchor Now" and dispatches anchorPendingEntries', async () => {
    vi.spyOn(ledgerApi, 'anchorPendingEntries').mockResolvedValue({
      created: true,
      block: { blockNo: 2, status: 'ANCHORED' },
    });

    render(<IntegrityPage />);
    const anchorBtn = await screen.findByRole('button', { name: /Anchor Now/i });
    fireEvent.click(anchorBtn);

    expect(await screen.findByText('Anchor Audit Trail to Blockchain')).toBeInTheDocument();
    expect(screen.getByText(/3 candidate rows/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Anchor/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(ledgerApi.anchorPendingEntries).toHaveBeenCalledTimes(1);
    });
  });

  it('performs Merkle inclusion proof search and displays cryptographic breakdown', async () => {
    vi.spyOn(ledgerApi, 'getLedgerProof').mockResolvedValue({
      auditEntryId: 42,
      blockNo: 1,
      leafHash: '0xleaf42',
      merkleRoot: '0xroot42',
      proof: ['0xsibling1', '0xsibling2'],
      txHash: '0xtx42',
    });

    render(<IntegrityPage />);
    const input = await screen.findByPlaceholderText('e.g. 42');
    fireEvent.change(input, { target: { value: '42' } });

    const lookupBtn = screen.getByRole('button', { name: /Lookup Proof/i });
    fireEvent.click(lookupBtn);

    expect(await screen.findByText(/Audit Entry #42 \(Block #1\)/)).toBeInTheDocument();
    expect(screen.getByText('Cryptographically Included')).toBeInTheDocument();
    expect(screen.getByText(/2 sibling hash steps/)).toBeInTheDocument();
  });

  it('renders educational trust notice emphasizing privacy and hashing', async () => {
    render(<IntegrityPage />);

    expect(
      await screen.findByText(/Institutional Privacy & Tamper Resistance/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Only fingerprints \(cryptographic SHA-256 hashes\) are stored on the blockchain/i)
    ).toBeInTheDocument();
  });

  describe('Navigation Role Matrix Visibility in AppLayout', () => {
    it('shows "Blockchain Integrity" link for SUPER_ADMIN', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { role: 'SUPER_ADMIN', name: 'Admin' },
        logout: vi.fn(),
      });
      render(
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      );
      expect(screen.getAllByText('Blockchain Integrity').length).toBeGreaterThan(0);
    });

    it('shows "Blockchain Integrity" link for MANAGEMENT', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { role: 'MANAGEMENT', name: 'Director' },
        logout: vi.fn(),
      });
      render(
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      );
      expect(screen.getAllByText('Blockchain Integrity').length).toBeGreaterThan(0);
    });

    it('shows "Blockchain Integrity" link for AUDITOR', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { role: 'AUDITOR', name: 'External Auditor' },
        logout: vi.fn(),
      });
      render(
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      );
      expect(screen.getAllByText('Blockchain Integrity').length).toBeGreaterThan(0);
    });

    it('hides "Blockchain Integrity" link for FINANCE, HOD, and STAFF', () => {
      const restrictedRoles = ['FINANCE', 'HOD', 'STAFF'];
      for (const role of restrictedRoles) {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
          user: { role, name: `User ${role}` },
          logout: vi.fn(),
        });
        const { unmount } = render(
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        );
        expect(screen.queryByText('Blockchain Integrity')).toBeNull();
        unmount();
      }
    });
  });
});
