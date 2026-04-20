import { useMemo, useState } from 'react';
import { extractRiskLevel, formatRecommendations } from '../utils/parseAnalysis';
import {
  copyToClipboard,
  buildReportText,
  downloadReportTxt,
  downloadReportPdf,
} from '../utils/reportActions';

export function cleanText(text = '') {
  return text
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTimestamp(value) {
  if (!value) return 'Timestamp unavailable';

  try {
    return new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function dedupeLines(text = '') {
  const lines = text
    .split(/(?<=\.)\s+|\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const seen = new Set();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatSectionText(text) {
  const lines = dedupeLines(text);
  if (!lines.length) return '';
  return lines.join('\n');
}

function formatContent(text) {
  const safeText = formatSectionText(text);
  if (!safeText) return null;

  const lines = safeText.split('\n').filter(Boolean);
  const isList =
    lines.length > 1 && lines.every((line) => /^\s*[-*]\s|^\s*\d+[.)]\s/.test(line));

  if (isList) {
    return (
      <ul style={styles.bulletList}>
        {lines.map((line, index) => (
          <li key={index} style={styles.bulletItem}>
            {line.replace(/^\s*[-*]\s*|^\s*\d+[.)]\s*/, '').trim()}
          </li>
        ))}
      </ul>
    );
  }

  return <p style={styles.contentText}>{safeText}</p>;
}

function getRiskTone(level) {
  const tones = {
    Low: { soft: 'rgba(22, 163, 74, 0.12)', strong: '#15803d', border: 'rgba(22, 163, 74, 0.18)' },
    Moderate: { soft: 'rgba(245, 158, 11, 0.12)', strong: '#b45309', border: 'rgba(245, 158, 11, 0.18)' },
    High: { soft: 'rgba(249, 115, 22, 0.12)', strong: '#c2410c', border: 'rgba(249, 115, 22, 0.18)' },
    Critical: { soft: 'rgba(220, 38, 38, 0.12)', strong: '#b91c1c', border: 'rgba(220, 38, 38, 0.18)' },
    Unknown: { soft: 'rgba(148, 163, 184, 0.12)', strong: '#475569', border: 'rgba(148, 163, 184, 0.18)' },
  };
  return tones[level] || tones.Unknown;
}

function AnalysisSection({
  parsedSections,
  activeTab = 'summary',
  setActiveTab,
  selectedTool = 'unknown',
  workflowPlan = '',
  createdAt = '',
  fileName = '',
  onNewUpload,
  riskLevel: riskLevelProp = '',
}) {
  const [copiedKey, setCopiedKey] = useState('');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showFullResponse, setShowFullResponse] = useState(false);

  if (!parsedSections) return null;

  const { raw, sections } = parsedSections;
  const safeSections = sections || {};
  const riskLevel = riskLevelProp || extractRiskLevel(raw);
  const riskTone = getRiskTone(riskLevel);

  const tabItems = useMemo(() => {
    const items = [
      {
        key: 'summary',
        label: 'Summary',
        title: 'Summary',
        description: 'High-level clinical interpretation of the uploaded report.',
        text: formatSectionText(safeSections.Summary),
        tone: sectionTones.summary,
      },
      {
        key: 'findings',
        label: 'Findings',
        title: 'Findings',
        description: 'Structured observations extracted from the report.',
        text: formatSectionText(safeSections['Key Findings']),
        tone: sectionTones.findings,
      },
      {
        key: 'risk',
        label: 'Risk',
        title: 'Risk Level',
        description: 'Risk classification derived from the analysis response.',
        text: formatSectionText(safeSections['Risk Level']) || riskLevel,
        tone: {
          background: `linear-gradient(180deg, ${riskTone.soft} 0%, rgba(255,255,255,0.98) 100%)`,
          border: riskTone.border,
        },
        render: () => (
          <div style={styles.riskContent}>
            <span
              style={{
                ...styles.riskBadgeLarge,
                backgroundColor: riskTone.soft,
                color: riskTone.strong,
                borderColor: riskTone.border,
              }}
            >
              {riskLevel}
            </span>
            {formatSectionText(safeSections['Risk Level']) && (
              <p style={styles.contentText}>{formatSectionText(safeSections['Risk Level'])}</p>
            )}
          </div>
        ),
      },
      {
        key: 'recommendations',
        label: 'Recommendations',
        title: 'Recommendations',
        description: 'Suggested next steps based on the report analysis.',
        text: formatSectionText(safeSections.Recommendations),
        tone: sectionTones.recommendations,
        render: (text) => {
          const recommendations = formatRecommendations(text);
          if (!recommendations.length) return <p style={styles.contentText}>{text}</p>;

          // Group by priority
          const urgent = recommendations.filter((r) => r.priority === 'urgent');
          const high = recommendations.filter((r) => r.priority === 'high');
          const standard = recommendations.filter((r) => r.priority === 'standard');

          const renderGroup = (items, groupPriority) => {
            if (!items.length) return null;

            const colorMap = {
              urgent: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
              high: { bg: '#fff7ed', border: '#f97316', text: '#92400e' },
              standard: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
            };
            const colors = colorMap[groupPriority];

            return (
              <div key={groupPriority} style={{ marginBottom: '16px' }}>
                {items.map((rec, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: colors.bg,
                      borderLeft: `4px solid ${colors.border}`,
                      borderRadius: '4px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: colors.text,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        minWidth: '90px',
                        paddingTop: '2px',
                      }}
                    >
                      {rec.displayPriority}
                    </span>
                    <span style={{ flex: 1 }}>{rec.content}</span>
                  </div>
                ))}
              </div>
            );
          };

          return (
            <div>
              {renderGroup(urgent, 'urgent')}
              {renderGroup(high, 'high')}
              {renderGroup(standard, 'standard')}
            </div>
          );
        },
      },
      {
        key: 'tool',
        label: 'Tool',
        title: 'Tool Decision',
        description: 'Selected analysis mode for the current report.',
        text:
          selectedTool && selectedTool !== 'unknown'
            ? cleanText(selectedTool.replace(/_/g, ' '))
            : '',
        tone: sectionTones.tool,
        render: () => (
          <div>
            <p style={styles.toolName}>{cleanText(selectedTool.replace(/_/g, ' '))}</p>
          </div>
        ),
      },
      {
        key: 'workflow',
        label: 'Workflow',
        title: 'Workflow Plan',
        description: 'Planner output used to guide execution and validation.',
        text:
          workflowPlan && workflowPlan !== 'No workflow plan returned.'
            ? formatSectionText(workflowPlan)
            : '',
        tone: sectionTones.workflow,
        render: (text) => <pre style={styles.workflowText}>{text}</pre>,
      },
    ];

    return items.filter((item) => {
      if (item.key === 'risk') {
        return Boolean(formatSectionText(safeSections['Risk Level'])) || riskLevel !== 'Unknown';
      }
      return Boolean(item.text);
    });
  }, [riskLevel, riskTone, safeSections, selectedTool, workflowPlan]);

  const currentTab = tabItems.find((item) => item.key === activeTab) || tabItems[0] || null;

  const fullReportText = buildReportText({
    summary: formatSectionText(safeSections.Summary),
    findings: formatSectionText(safeSections['Key Findings']),
    risk: formatSectionText(safeSections['Risk Level']) || (riskLevel !== 'Unknown' ? riskLevel : undefined),
    recommendations: formatSectionText(safeSections.Recommendations),
    fileName,
  });
  const cleanedRaw = cleanText(raw || '');

  async function copySection(key, text) {
    const copied = await copyToClipboard(text || '');
    if (!copied) return;
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? '' : current));
    }, 1600);
  }

  function handleDownload(format) {
    const reportData = {
      summary: formatSectionText(safeSections.Summary),
      findings: formatSectionText(safeSections['Key Findings']),
      risk: formatSectionText(safeSections['Risk Level']) || (riskLevel !== 'Unknown' ? riskLevel : undefined),
      recommendations: formatSectionText(safeSections.Recommendations),
      fileName,
    };

    if (format === 'pdf') downloadReportPdf(reportData);
    else downloadReportTxt(reportData);

    setShowDownloadOptions(false);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.reportCard}>
        <div style={styles.reportHeader}>
          <div>
            <p style={styles.reportEyebrow}>Clinical Report Card</p>
            <h3 style={styles.reportTitle}>{fileName || 'Uploaded Report'}</h3>
            <p style={styles.reportMeta}>Timestamp: {formatTimestamp(createdAt)}</p>
          </div>

          <div style={styles.reportActions}>
            <span
              style={{
                ...styles.riskBadge,
                backgroundColor: riskTone.soft,
                color: riskTone.strong,
                borderColor: riskTone.border,
              }}
            >
              {riskLevel}
            </span>

            <button
              type="button"
              onClick={() => copySection('full-report', fullReportText)}
              style={styles.primaryAction}
            >
              {copiedKey === 'full-report' ? 'Copied' : 'Copy Full Report'}
            </button>

            <div style={styles.downloadWrap}>
              <button
                type="button"
                onClick={() => setShowDownloadOptions((value) => !value)}
                style={styles.secondaryAction}
              >
                Download
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {showDownloadOptions ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showDownloadOptions && (
                <div style={styles.downloadMenu}>
                  <button type="button" onClick={() => handleDownload('txt')} style={styles.downloadOption}>
                    TXT
                  </button>
                  <button type="button" onClick={() => handleDownload('pdf')} style={styles.downloadOption}>
                    PDF
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={onNewUpload} style={styles.secondaryAction}>
              New Upload
            </button>
          </div>
        </div>
      </div>

      <nav style={styles.tabs}>
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key)}
            style={{
              ...styles.tabButton,
              ...(currentTab?.key === item.key ? styles.tabButtonActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {currentTab && (
        <div
          style={{
            ...styles.sectionCard,
            borderColor: currentTab.tone.border,
            background: currentTab.tone.background,
          }}
        >
          <div style={styles.sectionHeader}>
            <div>
              <h4 style={styles.sectionTitle}>{currentTab.title}</h4>
              <p style={styles.sectionDescription}>{currentTab.description}</p>
            </div>
            <button
              type="button"
              onClick={() => copySection(currentTab.key, currentTab.text)}
              style={styles.sectionCopyButton}
            >
              {copiedKey === currentTab.key ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div>
            {currentTab.render ? currentTab.render(currentTab.text) : formatContent(currentTab.text)}
          </div>
        </div>
      )}

      {Boolean(cleanedRaw) && (
        <div style={styles.fullResponseWrap}>
          <button
            type="button"
            onClick={() => setShowFullResponse((value) => !value)}
            style={styles.fullResponseToggle}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {showFullResponse ? 'expand_less' : 'expand_more'}
            </span>
            View Full Executor Response
          </button>

          {showFullResponse && (
            <div style={styles.fullResponseCard}>
              <div style={styles.sectionHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Full Executor Response</h4>
                  <p style={styles.sectionDescription}>Complete backend executor output.</p>
                </div>
                <button
                  type="button"
                  onClick={() => copySection('full-response', cleanedRaw)}
                  style={styles.sectionCopyButton}
                >
                  {copiedKey === 'full-response' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre style={styles.fullResponseText}>{cleanedRaw}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const sectionTones = {
  summary: {
    background: 'linear-gradient(180deg, rgba(224,242,254,0.78) 0%, #ffffff 100%)',
    border: 'rgba(14, 165, 233, 0.16)',
  },
  findings: {
    background: 'linear-gradient(180deg, rgba(204,251,241,0.75) 0%, #ffffff 100%)',
    border: 'rgba(20, 184, 166, 0.16)',
  },
  recommendations: {
    background: 'linear-gradient(180deg, rgba(236,254,255,0.78) 0%, #ffffff 100%)',
    border: 'rgba(8, 145, 178, 0.16)',
  },
  tool: {
    background: 'linear-gradient(180deg, rgba(241,245,249,0.88) 0%, #ffffff 100%)',
    border: 'rgba(148, 163, 184, 0.16)',
  },
  workflow: {
    background: 'linear-gradient(180deg, rgba(238,242,255,0.82) 0%, #ffffff 100%)',
    border: 'rgba(99, 102, 241, 0.16)',
  },
};

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  reportCard: {
    background: 'linear-gradient(180deg, rgba(240,249,255,0.96) 0%, rgba(255,255,255,0.98) 100%)',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  reportEyebrow: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0891b2',
  },
  reportTitle: {
    margin: '8px 0 6px',
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
    wordBreak: 'break-word',
  },
  reportMeta: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
  },
  reportActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  riskBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 14px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  primaryAction: {
    padding: '10px 16px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #0f766e, #0f5f8f)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  secondaryAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  downloadWrap: {
    position: 'relative',
  },
  downloadMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '140px',
    padding: '6px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    boxShadow: '0 16px 30px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: 10,
  },
  downloadOption: {
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  tabButton: {
    padding: '10px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.88)',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  tabButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.24)',
    color: '#0369a1',
  },
  sectionCard: {
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
  },
  sectionDescription: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.6,
  },
  sectionCopyButton: {
    padding: '9px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  contentText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.8,
    color: '#334155',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  bulletList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'grid',
    gap: '8px',
  },
  bulletItem: {
    fontSize: '14px',
    lineHeight: 1.75,
    color: '#334155',
  },
  riskContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  riskBadgeLarge: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    padding: '10px 16px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  toolName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    textTransform: 'capitalize',
    fontFamily: "'Manrope', sans-serif",
  },
  workflowText: {
    margin: 0,
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.84)',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '13px',
    lineHeight: 1.7,
    color: '#334155',
    fontFamily: "'Inter', sans-serif",
  },
  fullResponseWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  fullResponseToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  fullResponseCard: {
    padding: '22px',
    borderRadius: '24px',
    background: 'linear-gradient(180deg, rgba(241,245,249,0.88) 0%, #ffffff 100%)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
  },
  fullResponseText: {
    margin: 0,
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    color: '#334155',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '12px',
    lineHeight: 1.7,
    fontFamily: "'Consolas', 'Courier New', monospace",
    maxHeight: '320px',
    overflowY: 'auto',
    overflowX: 'auto',
  },
};

export default AnalysisSection;
