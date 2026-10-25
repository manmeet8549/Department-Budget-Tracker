import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DataTable from '../../../components/DataTable';
import StatusBadge from '../../../components/StatusBadge';
import { formatINR } from '../../../utils/currency';

export default function ExpenseList({
  expenses,
  loading,
  error,
  paginationMeta,
  page,
  setPage,
  actionLoading,
  canSubmit,
  canEditOrDelete,
  canApproveOrReject,
  canPay,
  onViewDetails,
  onSubmitExpense,
  onOpenEdit,
  onDeleteDraft,
  onOpenApprove,
  onOpenReject,
  onOpenPay,
}) {
  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (row) => `#${row.id}`,
    },
    {
      header: 'Financial Year',
      accessor: 'financialYear',
      render: (row) => row.financialYear?.year || '-',
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => row.department?.code || row.department?.name || '-',
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => row.category?.name || '-',
    },
    {
      header: 'Purpose',
      accessor: 'purpose',
      render: (row) => (
        <span
          title={row.purpose}
          style={{
            maxWidth: '180px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.purpose}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          ₹{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Created By',
      accessor: 'creator',
      render: (row) => row.creator?.name || row.creator?.email || '-',
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(row.id)}
            id={`btn-view-${row.id}`}
          >
            View
          </Button>

          {/* Submit button on own drafts */}
          {canSubmit(row) && (
            <Button
              size="sm"
              variant="primary"
              disabled={actionLoading}
              onClick={() => onSubmitExpense(row)}
              id={`btn-submit-${row.id}`}
            >
              Submit
            </Button>
          )}

          {/* Edit / Delete on drafts */}
          {canEditOrDelete(row) && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onOpenEdit(row)}
                id={`btn-edit-${row.id}`}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDeleteDraft(row)}
                id={`btn-delete-${row.id}`}
              >
                Delete
              </Button>
            </>
          )}

          {/* Approve / Reject buttons for correct approver */}
          {canApproveOrReject(row) && (
            <>
              <Button
                size="sm"
                variant="primary"
                disabled={actionLoading}
                onClick={() => onOpenApprove(row)}
                id={`btn-approve-${row.id}`}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={actionLoading}
                onClick={() => onOpenReject(row)}
                id={`btn-reject-${row.id}`}
              >
                Reject
              </Button>
            </>
          )}

          {/* Pay button for FINANCE */}
          {canPay(row) && (
            <Button
              size="sm"
              variant="primary"
              disabled={actionLoading}
              onClick={() => onOpenPay(row)}
              id={`btn-pay-${row.id}`}
            >
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card style={{ padding: '0px', overflow: 'hidden' }}>
      {error && (
        <div style={{ padding: '16px', color: 'var(--dp-color-danger, #ef4444)' }}>
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        emptyMessage="No expenses found matching the current criteria."
      />

      {/* Pagination Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderTop: '1px solid var(--dp-color-rule)',
          fontSize: '13px',
          color: 'var(--dp-color-ink-secondary)',
        }}
      >
        <div>
          Showing {expenses.length} of {paginationMeta.total} records
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span>
            Page {paginationMeta.page} of {paginationMeta.totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= paginationMeta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
