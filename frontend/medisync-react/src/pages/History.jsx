import { useEffect, useState } from 'react';
import { getAnalysisHistory, clearAnalysisHistory } from '../utils/historyStorage';

function History() {
  const [history, setHistory] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    const storedHistory = getAnalysisHistory();
    setHistory(storedHistory);
    setSelectedEntry(null);
  }, []);

  function handleClearHistory() {
    clearAnalysisHistory();
    setHistory([]);
    setSelectedEntry(null);
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.heading}>Analysis History</h2>
          <p style={styles.subtext}>
            Past analysis results stored locally on this browser.
          </p>
        </div>

        {history.length > 0 && (
          <button onClick={handleClearHistory} style={styles.clearBtn}>
            Clear History
          </button>
        )}
      </div>

      <div style={styles.layout}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Filename</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Risk Level</th>
                <th style={styles.th}>Tool Used</th>
                <th style={styles.th}>Parser</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyRow}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '36px', color: '#c2c6d4', marginBottom: '8px' }}
                    >
                      history
                    </span>
                    <p>No analyses yet. Upload a report from the Dashboard to get started.</p>
                  </td>
                </tr>
              ) : (
                history.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        ...styles.dataRow,
                        ...(isSelected ? styles.dataRowSelected : {}),
                      }}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td style={styles.td}>
                        <div style={styles.fileCell}>
                          <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '20px' }}>
                            picture_as_pdf
                          </span>
                          <div>
                            <p style={styles.fileName}>{entry.fileName}</p>
                            <p style={styles.fileMeta}>{formatFileSize(entry.fileSize)}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...getRiskStyles(entry.riskLevel) }}>
                          {entry.riskLevel || 'Unknown'}
                        </span>
                      </td>
                      <td style={styles.td}>{formatTool(entry.selectedTool)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(entry.parseFailed ? styles.parseFallback : styles.parseSuccess) }}>
                          {entry.parseFailed ? 'Fallback' : 'Structured'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedEntry && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>Analysis Details</h3>
              <span style={{ ...styles.badge, ...getRiskStyles(selectedEntry.riskLevel) }}>
                {selectedEntry.riskLevel || 'Unknown'}
              </span>
            </div>

            <div style={styles.detailMeta}>
              <p><strong>Tool:</strong> {formatTool(selectedEntry.selectedTool)}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedEntry.createdAt).toLocaleString()}</p>
            </div>

            <div style={styles.detailBlock}>
              <h4 style={styles.blockTitle}>Workflow Plan</h4>
              <pre style={styles.preBlock}>{selectedEntry.workflowPlan || 'No workflow plan returned.'}</pre>
            </div>

            <div style={styles.detailBlock}>
              <h4 style={styles.blockTitle}>Full Analysis</h4>
              <pre style={styles.preBlock}>{selectedEntry.analysis || 'No analysis returned.'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTool(tool) {
  const labels = {
    medical_analysis: 'Medical Analysis',
    general_summary: 'General Summary',
    irrelevant_content: 'Irrelevant Content',
  };
  return labels[tool] || tool || 'unknown';
}

function formatFileSize(size) {
  if (!size) return 'Unknown size';
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getRiskStyles(level) {
  const stylesByLevel = {
    Low: { backgroundColor: 'rgba(0, 110, 13, 0.08)', color: '#006e0d' },
    Moderate: { backgroundColor: 'rgba(124, 88, 0, 0.08)', color: '#7c5800' },
    High: { backgroundColor: 'rgba(186, 26, 26, 0.08)', color: '#ba1a1a' },
    Critical: { backgroundColor: 'rgba(147, 0, 10, 0.08)', color: '#93000a' },
    Unknown: { backgroundColor: '#f3f4f5', color: '#727783' },
  };

  return stylesByLevel[level] || stylesByLevel.Unknown;
}

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  heading: {
    fontSize: '36px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#191c1d',
    marginBottom: '8px',
    fontFamily: "'Manrope', sans-serif",
  },
  subtext: {
    fontSize: '16px',
    color: '#424752',
  },
  clearBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #c2c6d4',
    backgroundColor: '#ffffff',
    color: '#424752',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  tableWrap: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    overflowX: 'auto',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 4px 20px rgba(25, 28, 29, 0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '760px',
  },
  th: {
    textAlign: 'left',
    padding: '14px 20px',
    fontWeight: 700,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#727783',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    fontFamily: "'Manrope', sans-serif",
  },
  td: {
    padding: '18px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    color: '#424752',
    verticalAlign: 'middle',
  },
  dataRow: {
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  dataRowSelected: {
    backgroundColor: 'rgba(0, 93, 182, 0.04)',
  },
  fileCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  fileName: {
    fontWeight: 700,
    color: '#191c1d',
    marginBottom: '4px',
  },
  fileMeta: {
    fontSize: '12px',
    color: '#727783',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: "'Manrope', sans-serif",
  },
  parseSuccess: {
    backgroundColor: 'rgba(0, 93, 182, 0.08)',
    color: '#005db6',
  },
  parseFallback: {
    backgroundColor: 'rgba(124, 88, 0, 0.08)',
    color: '#7c5800',
  },
  emptyRow: {
    textAlign: 'center',
    padding: '60px 24px',
    color: '#727783',
    fontSize: '14px',
  },
  detailPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(25, 28, 29, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    maxHeight: '75vh',
    overflowY: 'auto',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  },
  detailTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#191c1d',
    fontFamily: "'Manrope', sans-serif",
  },
  detailMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#424752',
    fontSize: '14px',
    marginBottom: '20px',
  },
  detailBlock: {
    marginBottom: '20px',
  },
  blockTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#191c1d',
    marginBottom: '10px',
    fontFamily: "'Manrope', sans-serif",
  },
  preBlock: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '13px',
    lineHeight: 1.7,
    color: '#424752',
    margin: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '14px',
  },
};

export default History;
