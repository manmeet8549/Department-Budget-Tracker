import { apiClient } from './client.js';

export async function getLedgerStatus() {
  const res = await apiClient.get('/ledger/status');
  return res.data.data;
}

export async function listLedgerBlocks(params = {}) {
  const res = await apiClient.get('/ledger/blocks', { params });
  return {
    data: res.data.data,
    meta: res.data.meta,
  };
}

export async function anchorPendingEntries() {
  const res = await apiClient.post('/ledger/anchor');
  return res.data.data;
}

export async function retryLedgerBlock(id) {
  const res = await apiClient.post(`/ledger/blocks/${id}/retry`);
  return res.data.data;
}

export async function verifyLedgerIntegrity() {
  const res = await apiClient.post('/ledger/verify');
  return res.data.data;
}

export async function getLedgerProof(auditEntryId) {
  const res = await apiClient.get(`/ledger/proof/${auditEntryId}`);
  return res.data.data;
}

