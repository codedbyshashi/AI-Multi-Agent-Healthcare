import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { extractRiskLevel } from '../utils/parseAnalysis';
import PipelineVisualizer from '../components/PipelineVisualizer';
import ValidatorPanel from '../components/ValidatorPanel';
import AnalysisSection from '../components/AnalysisSection';

function AnalysisResult() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [activeSection, setActiveSection] = useState('summary');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  const result = state?.result || null;
  const parsedSections = state?.parsedSections || null;
  const fileMeta = state?.fileMeta || null;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1100;

  const sections = parsedSections?.sections || {};
  const riskLevel = result ? extractRiskLevel(result.analysis || '') : 'Unknown';
  const analysisHeight = isMobile ? 'auto' : 'calc(100vh - 160px)';

  const sectionItems = useMemo(() => {
    const isSummaryTool = result?.selectedTool === 'general_summary';

    if (isSummaryTool) {
      return [
        { key: 'summary', label: 'Summary', icon: 'summarize', available: true },
        { key: 'tool', label: 'Tool', icon: 'construction', available: Boolean(result?.selectedTool) },
        { key: 'workflow', label: 'Workflow', icon: 'hub', available: Boolean(result?.workflowPlan) },
      ];
    }

    return [
      { key: 'summary', label: 'Summary', icon: 'clinical_notes', available: Boolean(sections.Summary) },
      { key: 'findings', label: 'Findings', icon: 'checklist', available: Boolean(sections['Key Findings']) },
      { key: 'risk', label: 'Risk', icon: 'warning', available: riskLevel !== 'Unknown' || Boolean(sections['Risk Level']) },
      { key: 'recommendations', label: 'Recommendations', icon: 'arrow_forward', available: Boolean(sections.Recommendations) },
      { key: 'tool', label: 'Tool', icon: 'construction', available: Boolean(result?.selectedTool) },
      { key: 'workflow', label: 'Workflow', icon: 'hub', available: Boolean(result?.workflowPlan) },
    ];
  }, [sections, result, riskLevel]);

  const visibleSectionItems = sectionItems.filter((item) => item.available);
  const selectedSection = visibleSectionItems.find((item) => item.key === activeSection)?.key
    || visibleSectionItems[0]?.key
    || 'summary';

  if (!result || !parsedSections) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.emptyCard}>
            <span className="material-symbols-outlined" style={{ fontSize: '34px', color: '#1e3a8a' }}>
              description
            </span>
            <h2 style={styles.emptyTitle}>No analysis result available</h2>
            <p style={styles.emptyText}>
              Start from the dashboard, upload a PDF, and the completed analysis will open here.
            </p>
            <button onClick={() => navigate('/')} style={styles.primaryBtn}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.analysisShell}>
          {isMobile ? (
            <details style={styles.mobilePipelineCard}>
              <summary style={styles.mobilePipelineSummary}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>hub</span>
                Agent Pipeline
              </summary>
              <div style={{ marginTop: '16px' }}>
                <PipelineVisualizer activeStep={5} isProcessing={false} status="success" />
                <div style={{ marginTop: '16px' }}>
                  <ValidatorPanel result={result} parsedSections={parsedSections} selectedTool={result.selectedTool} />
                </div>
              </div>
            </details>
          ) : null}

          <div
            style={{
              ...styles.analysisGrid,
              height: analysisHeight,
              gridTemplateColumns: isMobile
                ? '1fr'
                : isTablet
                  ? 'minmax(0, 0.95fr) minmax(0, 1.25fr)'
                  : 'minmax(280px, 0.95fr) minmax(220px, 0.7fr) minmax(420px, 1.35fr)',
            }}
          >
            {!isMobile && (
              <aside style={styles.leftRail}>
                <div style={styles.panelShell}>
                  <div style={styles.panelHeader}>
                    <div>
                      <p style={styles.panelEyebrow}>Workflow</p>
                      <h3 style={styles.panelTitle}>Agent Pipeline</h3>
                    </div>
                    <button onClick={() => navigate('/')} style={styles.secondaryBtn}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
                      New Upload
                    </button>
                  </div>

                  <div style={styles.scrollPanel}>
                    <div style={styles.fileSummaryCard}>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileIconWrap}>
                          <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>
                            picture_as_pdf
                          </span>
                        </div>
                        <div>
                          <p style={styles.fileName}>{fileMeta?.name || 'Clinical Report'}</p>
                          {fileMeta?.size ? (
                            <p style={styles.fileSize}>
                              {(fileMeta.size / (1024 * 1024)).toFixed(2)} MB | Completed analysis
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <PipelineVisualizer activeStep={5} isProcessing={false} status="success" />
                    <ValidatorPanel result={result} parsedSections={parsedSections} selectedTool={result.selectedTool} />
                  </div>
                </div>
              </aside>
            )}

            <aside style={styles.middleRail}>
              <div style={styles.navShell}>
                <div style={styles.panelHeader}>
                  <div>
                    <p style={styles.panelEyebrow}>Review</p>
                    <h3 style={styles.panelTitle}>Sections</h3>
                  </div>
                  {isMobile && (
                    <button onClick={() => navigate('/')} style={styles.secondaryBtn}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
                      New Upload
                    </button>
                  )}
                </div>

                <div style={styles.navScrollArea}>
                  {visibleSectionItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setActiveSection(item.key)}
                      style={{
                        ...styles.sectionButton,
                        ...(selectedSection === item.key ? styles.sectionButtonActive : {}),
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '18px',
                          color: selectedSection === item.key ? '#1e3a8a' : '#475569',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section style={styles.rightPanel}>
              <div style={styles.contentShell}>
                <AnalysisSection
                  parsedSections={parsedSections}
                  activeSection={selectedSection}
                  selectedTool={result.selectedTool}
                  workflowPlan={result.workflowPlan}
                  createdAt={result.createdAt}
                  fileName={fileMeta?.name || ''}
                  onNewUpload={() => navigate('/')}
                  riskLevel={riskLevel}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #e2ebf5 0%, #f1f5f9 24%, #f8fbfd 100%)',
  },
  container: {
    maxWidth: '1480px',
    margin: '0 auto',
    padding: '28px 20px 40px',
  },
  analysisShell: {
    overflow: 'hidden',
  },
  analysisGrid: {
    display: 'grid',
    gap: '18px',
    alignItems: 'stretch',
  },
  leftRail: {
    minWidth: 0,
    height: '100%',
  },
  middleRail: {
    minWidth: 0,
    height: '100%',
  },
  rightPanel: {
    minWidth: 0,
    height: '100%',
  },
  panelShell: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  navShell: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.05)',
    overflow: 'hidden',
  },
  contentShell: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  panelEyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#14b8a6',
    marginBottom: '6px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
  },
  scrollPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  navScrollArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  sectionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid transparent',
    backgroundColor: 'rgba(255,255,255,0.72)',
    color: '#334155',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  sectionButtonActive: {
    background: 'linear-gradient(135deg, rgba(30,58,138,0.14) 0%, rgba(20,184,166,0.12) 100%)',
    color: '#1e3a8a',
    borderColor: 'rgba(30, 58, 138, 0.14)',
    boxShadow: '0 10px 24px rgba(30, 58, 138, 0.08)',
  },
  fileSummaryCard: {
    padding: '16px',
    borderRadius: '18px',
    background: 'linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)',
    border: '1px solid rgba(30, 58, 138, 0.1)',
    marginBottom: '16px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileIconWrap: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.06)',
    flexShrink: 0,
  },
  fileName: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#0f172a',
  },
  fileSize: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(30, 58, 138, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: '#1e3a8a',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  mobilePipelineCard: {
    marginBottom: '16px',
    padding: '16px 18px',
    borderRadius: '22px',
    backgroundColor: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
  },
  mobilePipelineSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#1e3a8a',
    fontWeight: 800,
    cursor: 'pointer',
    listStyle: 'none',
    fontFamily: "'Manrope', sans-serif",
  },
  emptyCard: {
    maxWidth: '620px',
    margin: '80px auto',
    padding: '32px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '14px 0 10px',
    fontFamily: "'Manrope', sans-serif",
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#475569',
    marginBottom: '18px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 18px',
    borderRadius: '14px',
    border: '1px solid transparent',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(30, 58, 138, 0.18)',
  },
};

export default AnalysisResult;
