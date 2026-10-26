import { Inbox, Loader2 } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  keyAccessor = 'id',
  emptyMessage = 'No records found.',
  loading = false,
  style = {},
  id,
  footer = null,
}) {
  return (
    <div
      id={id}
      className="dp-data-table-card"
      style={{
        width: '100%',
        backgroundColor: 'var(--dp-color-panel)',
        borderRadius: 'var(--dp-radius-lg)',
        border: '1px solid var(--dp-color-rule)',
        boxShadow: 'var(--dp-shadow-sm)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div className="dp-table-scroll-wrapper">
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 'var(--dp-typography-interface)',
            fontFamily: 'Instrument Sans, var(--dp-typography-fallback)',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--dp-color-ground-muted)',
                borderBottom: '1px solid var(--dp-color-rule)',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              {columns.map((col, idx) => {
                const isNumeric = col.align === 'right' || col.isNumeric;
                return (
                  <th
                    key={col.header || idx}
                    scope="col"
                    className={isNumeric ? 'numeric' : ''}
                    style={{
                      padding: '12px 16px',
                      fontWeight: '700',
                      fontSize: 'var(--dp-typography-metadata)',
                      color: 'var(--dp-color-ink-secondary)',
                      textAlign: isNumeric ? 'right' : col.align || 'left',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: 'var(--dp-color-ink-secondary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Loader2
                      size={24}
                      color="var(--dp-color-accent)"
                      style={{ animation: 'spin 0.8s linear infinite' }}
                    />
                    <span style={{ fontSize: 'var(--dp-typography-small)' }}>
                      Loading records...
                    </span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  data-testid="data-table-empty"
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: 'var(--dp-color-ink-secondary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--dp-color-ground-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Inbox size={22} color="var(--dp-color-ink-muted)" />
                    </div>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: 'var(--dp-typography-interface)',
                        color: 'var(--dp-color-ink)',
                      }}
                    >
                      {emptyMessage}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowKey =
                  typeof keyAccessor === 'function'
                    ? keyAccessor(row)
                    : row[keyAccessor] ?? rowIdx;
                return (
                  <tr
                    key={rowKey}
                    style={{
                      borderBottom:
                        rowIdx === data.length - 1
                          ? 'none'
                          : '1px solid var(--dp-color-rule-subtle)',
                      transition:
                        'background-color var(--dp-motion-interaction) var(--dp-motion-easing)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--dp-color-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((col, colIdx) => {
                      const isNumeric = col.align === 'right' || col.isNumeric;
                      const cellContent = col.render
                        ? col.render(row)
                        : row[col.accessor];
                      return (
                        <td
                          key={col.header || colIdx}
                          className={isNumeric ? 'numeric' : ''}
                          style={{
                            padding: '12px 16px',
                            color: 'var(--dp-color-ink)',
                            textAlign: isNumeric ? 'right' : col.align || 'left',
                            verticalAlign: 'middle',
                            fontVariantNumeric: isNumeric
                              ? 'tabular-nums'
                              : 'normal',
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
      {footer && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid var(--dp-color-rule)',
            backgroundColor: 'var(--dp-color-panel)',
            fontSize: 'var(--dp-typography-metadata)',
            color: 'var(--dp-color-ink-secondary)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
