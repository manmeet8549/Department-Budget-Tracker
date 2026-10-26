export default function ExpenseFilters({
  fyFilter,
  setFyFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  deptFilter,
  setDeptFilter,
  isGlobalRole,
  financialYears,
  categories,
  departments,
  setPage,
}) {
  const selectStyle = {
    padding: '6px 12px',
    borderRadius: 'var(--dp-radius-sm)',
    border: '1px solid var(--dp-color-rule)',
    backgroundColor: 'var(--dp-color-panel)',
    color: 'var(--dp-color-ink)',
    fontSize: 'var(--dp-typography-metadata)',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: 'var(--dp-typography-metadata)',
    fontWeight: '600',
    color: 'var(--dp-color-ink-secondary)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={labelStyle}>
          Financial Year:
        </label>
        <select
          value={fyFilter}
          onChange={(e) => {
            setFyFilter(e.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="">All Years</option>
          {financialYears.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.year} {fy.isActive ? '(Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isGlobalRole && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={labelStyle}>
            Department:
          </label>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            style={selectStyle}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} - {dept.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={labelStyle}>
          Category:
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={labelStyle}>
          Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="PAID">PAID</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>
    </div>
  );
}
