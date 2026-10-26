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
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600' }}>
          #{row.id}
        </span>
      ),
    },
    {
      header: 'Financial Year',
      accessor: 'financialYear',
      render: (row) => row.financialYear?.year || '-',
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => (
        <div>
          <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
            {row.department?.code || '-'}
          </span>
          {row.department?.name && (
            <div style={{ fontSize: 'var(--dp-typography-metadata)', color: 'var(--dp-color-ink-secondary)' }}>
              {row.department.name}
            </div>
          )}
        </div>
      ),
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
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--dp-color-ink)' }}>
          ₹{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Created By',
      accessor: 'creator',
      render: (row) => (
        <span style={{ fontSize: 'var(--dp-typography-metadata)', color: 'var(--dp-color-ink-secondary)' }}>
          {row.creator?.name || row.creator?.email || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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

  const paginationFooter = (
    <>
      <div style={{ fontSize: 'var(--dp-typography-metadata)', color: 'var(--dp-color-ink-secondary)' }}>
        Showing <strong style={{ color: 'var(--dp-color-ink)' }}>{expenses.length}</strong> of{' '}
        <strong style={{ color: 'var(--dp-color-ink)' }}>{paginationMeta.total}</strong> records
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
        <span style={{ fontSize: 'var(--dp-typography-metadata)', color: 'var(--dp-color-ink-secondary)', padding: '0 4px' }}>
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
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--dp-radius-md)',
            backgroundColor: 'var(--dp-color-danger-subtle)',
            border: '1px solid var(--dp-color-danger-border)',
            color: 'var(--dp-color-danger)',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <DataTable
        id="table-expenses"
        columns={columns}
        data={expenses}
        loading={loading}
        emptyMessage="No expenses found matching the current criteria."
        footer={paginationFooter}
      />
    </div>
  );
}
