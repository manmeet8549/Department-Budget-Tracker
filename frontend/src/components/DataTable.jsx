export default function DataTable({
  columns = [],
  data = [],
  keyAccessor = 'id',
  emptyMessage = 'No records found.',
  loading = false,
  style = {},
  id,
}) {
  return (
    <div
      id={id}
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: '8px',
        border: '1px solid var(--dp-color-rule)',
        backgroundColor: 'var(--dp-color-panel)',
        ...style,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: 'var(--dp-typography-interface)',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--dp-color-ground-muted)',
              borderBottom: '1px solid var(--dp-color-rule)',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.header || idx}
                scope="col"
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  fontSize: 'var(--dp-typography-metadata)',
                  color: 'var(--dp-color-ink-secondary)',
                  textAlign: col.align || 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--dp-color-ink-secondary)',
                }}
              >
                Loading data...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--dp-color-ink-secondary)',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = typeof keyAccessor === 'function' ? keyAccessor(row) : row[keyAccessor] ?? rowIdx;
              return (
                <tr
                  key={rowKey}
                  style={{
                    borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid var(--dp-color-rule)',
                    transition: 'background-color var(--dp-motion-interaction) var(--dp-motion-easing)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--dp-color-ground)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col, colIdx) => {
                    const isNumeric = col.align === 'right' || col.isNumeric;
                    const cellContent = col.render ? col.render(row) : row[col.accessor];
                    return (
                      <td
                        key={col.header || colIdx}
                        className={isNumeric ? 'numeric' : ''}
                        style={{
                          padding: '12px 16px',
                          color: 'var(--dp-color-ink)',
                          textAlign: col.align || 'left',
                          verticalAlign: 'middle',
                        }}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
