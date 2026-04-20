import { useEffect, useMemo, useState } from 'react';
import { analyzeReport } from '../services/api';
import { parseAnalysis, extractRiskLevel } from '../utils/parseAnalysis';
import { saveAnalysisHistory } from '../utils/historyStorage';
import PipelineVisualizer from '../components/PipelineVisualizer';
import AnalysisSection from '../components/AnalysisSection';
import ValidatorPanel from '../components/ValidatorPanel';

const INITIAL_PIPELINE = {
  activeStep: -1,
  status: 'idle',
  message: 'Select a PDF to begin.',
};

function Dashboard() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [parsedSections, setParsedSections] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [activeTab, setActiveTab] = useState('summary');
  const [pipeline, setPipeline] = useState(INITIAL_PIPELINE);
  const [pipelineResponse, setPipelineResponse] = useState(null);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 960);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];

    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError(null);
      setResult(null);
      setParsedSections(null);
      setIsAnalyzing(false);
      setActiveTab('summary');
      setPipelineResponse(null);
      setPipeline({
        activeStep: 0,
        status: 'idle',
        message: 'File selected. Ready to send the analysis request.',
      });
      return;
    }

    if (selected) {
      setError('Please select a valid PDF file.');
      setFile(null);
      setPipeline(INITIAL_PIPELINE);
    }
  }

  function scrollToUpload() {
    const uploadElement = document.querySelector('[data-scroll-target="upload"]');
    if (uploadElement) {
      uploadElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getStepFromStatus(status) {
    if (!status) return 2;

    if (status.validator === 'success') return 6;
    if (status.executor === 'success') return 5;
    if (status.planner === 'success') return 4;
    if (status.tool === 'success') return 3;

    return 2;
  }

  function getPipelineMessage(step, status) {
    if (status?.validator === 'failed') return 'Validation failed during backend execution.';
    if (status?.executor === 'failed') return 'Executor failed during backend execution.';
    if (status?.planner === 'failed') return 'Planner failed during backend execution.';
    if (status?.tool === 'failed') return 'Tool selection failed during backend execution.';

    if (step >= 6) return 'Validation completed from backend response.';
    if (step >= 5) return 'Executor completed from backend response.';
    if (step >= 4) return 'Planner completed from backend response.';
    if (step >= 3) return 'Tool identified from backend response.';
    return 'API call started. Waiting for backend response.';
  }

  useEffect(() => {
    if (!pipelineResponse?.pipeline_status) return;

    const status = pipelineResponse.pipeline_status;
    console.log('PIPELINE STATUS:', status);

    const finalStep = getStepFromStatus(status);
    const hasError =
      status?.validator === 'failed' ||
      status?.executor === 'failed' ||
      status?.planner === 'failed' ||
      status?.tool === 'failed';

    setPipeline({
      activeStep: finalStep - 1,
      status: hasError ? 'error' : finalStep >= 6 ? 'completed' : 'ready',
      message: getPipelineMessage(finalStep, status),
    });
  }, [JSON.stringify(pipelineResponse?.pipeline_status)]);

  async function handleAnalyze() {
    if (loading || !file) return;

    setLoading(true);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setParsedSections(null);
    setActiveTab('summary');
    setPipelineResponse(null);
    setPipeline({
      activeStep: 1,
      status: 'running',
      message: 'API call started. Waiting for backend response.',
    });

    try {
      const response = await analyzeReport(file);
      const data = response?.data || {};
      const selectedTool = data.selected_tool || 'unknown';
      const workflowPlan = data.workflow_plan || '';
      const analysisText = data.analysis || '';
      const validation = data.validation || null;
      const createdAt = new Date().toISOString();
      const parsed = parseAnalysis(analysisText);

      const nextResult = {
        workflowPlan,
        selectedTool,
        analysis: analysisText,
        validation,
        pipelineStatus: data.pipeline_status || null,
        createdAt,
      };

      setResult(nextResult);
      setParsedSections(parsed);
      setPipelineResponse({ ...data });

      saveAnalysisHistory({
        id: `${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        createdAt,
        selectedTool,
        workflowPlan,
        analysis: analysisText,
        riskLevel: extractRiskLevel(analysisText),
        parseFailed: parsed.parseFailed,
      });
    } catch (err) {
      setPipeline({
        activeStep: 1,
        status: 'error',
        message: 'Analysis failed while waiting for backend response.',
      });

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Analysis timed out. The document may be too large.');
      } else if (!err.response) {
        setError('Cannot reach the backend server. Ensure FastAPI is running on port 8001.');
      } else {
        const serverMsg = err.response?.data?.error || err.message;
        setError(`Server error: ${serverMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setParsedSections(null);
    setError(null);
    setLoading(false);
    setIsAnalyzing(false);
    setActiveTab('summary');
    setPipelineResponse(null);
    setPipeline(INITIAL_PIPELINE);

    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) fileInput.value = '';

    scrollToUpload();
  }

  const riskLevel = result ? extractRiskLevel(result.analysis || '') : 'Unknown';

  const availableTabs = useMemo(() => {
    if (!result) return [];

    const sections = parsedSections?.sections || {};
    return [
      { key: 'summary', show: Boolean(sections.Summary?.trim()) },
      { key: 'findings', show: Boolean(sections['Key Findings']?.trim()) },
      { key: 'risk', show: Boolean(sections['Risk Level']?.trim()) || riskLevel !== 'Unknown' },
      { key: 'recommendations', show: Boolean(sections.Recommendations?.trim()) },
      { key: 'tool', show: Boolean(result.selectedTool && result.selectedTool !== 'unknown') },
      { key: 'workflow', show: Boolean(result.workflowPlan?.trim()) },
    ]
      .filter((item) => item.show)
      .map((item) => item.key);
  }, [parsedSections, result, riskLevel]);

  useEffect(() => {
    if (!availableTabs.length) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.badge}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#0f766e', fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
              Precision Mode Active
            </span>
          </div>
          <h2 style={styles.heading}>AI Multi-Agent Healthcare Analyzer</h2>
          <p style={styles.subtext}>
            Upload clinical PDF reports for comprehensive multi-agent analysis.
          </p>
        </div>
      </div>

      {!isAnalyzing && (
        <div style={styles.uploadCard} data-scroll-target="upload">
          <div style={styles.uploadInner}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: '#0f766e' }}
            >
              upload_file
            </span>
            <h3 style={styles.uploadTitle}>Drop clinical reports here</h3>
            <p style={styles.uploadDesc}>
              Upload PDF reports for analysis. Max recommended size: 5MB.
            </p>

            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            <label htmlFor="pdf-upload" style={styles.selectBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              Select PDF Report
            </label>
          </div>

          {file && (
            <div style={styles.fileBar}>
              <div style={styles.fileInfo}>
                <div style={styles.fileIconWrap}>
                  <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>
                    picture_as_pdf
                  </span>
                </div>
                <div>
                  <p style={styles.fileName}>{file.name}</p>
                  <p style={styles.fileSize}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB | Ready to analyze
                  </p>
                </div>
              </div>

              <div style={styles.actionRow}>
                <button onClick={handleReset} style={styles.resetBtn}>
                  Clear
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  style={{
                    ...styles.analyzeBtn,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Analyzing...' : 'Analyze Report'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isAnalyzing && (
        <div style={styles.analysisShell}>
          <div
            style={{
              ...styles.analysisGrid,
              gridTemplateColumns: isMobile ? '1fr' : '30% 70%',
            }}
          >
            <aside style={{ ...styles.pipelineColumn, order: isMobile ? 2 : 1 }}>
              <div style={styles.pipelineStack}>
                <PipelineVisualizer
                  activeStep={pipeline.activeStep}
                  status={pipeline.status}
                  message={pipeline.message}
                  response={pipelineResponse}
                />
                {result && (
                  <ValidatorPanel result={result} parsedSections={parsedSections} />
                )}
              </div>
            </aside>

            <section style={{ ...styles.analysisColumn, order: isMobile ? 1 : 2 }}>
              {error && (
                <div style={styles.errorCard}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#b91c1c' }}>
                    error
                  </span>
                  <div>
                    <h3 style={styles.errorTitle}>Analysis Failed</h3>
                    <p style={styles.errorMsg}>{error}</p>
                    <button onClick={handleReset} style={styles.retryBtn}>
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {loading && !result && (
                <div style={styles.pendingCard}>
                  <div style={styles.pendingHeader}>
                    <h3 style={styles.pendingTitle}>Clinical Report Card</h3>
                    <span style={styles.pendingBadge}>In Progress</span>
                  </div>
                  <p style={styles.pendingText}>
                    Waiting for backend analysis. The pipeline stays on API Call Started until the response arrives.
                  </p>
                </div>
              )}

              {result && (
                <AnalysisSection
                  parsedSections={parsedSections}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  selectedTool={result.selectedTool}
                  workflowPlan={result.workflowPlan}
                  createdAt={result.createdAt}
                  fileName={file?.name}
                  riskLevel={riskLevel}
                  onNewUpload={handleReset}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '24px 24px 48px',
  },
  headerRow: {
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '999px',
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
    border: '1px solid rgba(15, 118, 110, 0.1)',
    marginBottom: '12px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: '#0f172a',
    marginBottom: '6px',
    fontFamily: "'Manrope', sans-serif",
  },
  subtext: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  uploadCard: {
    background: 'linear-gradient(180deg, rgba(240,249,255,0.78) 0%, #ffffff 100%)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
    border: '1px solid rgba(148, 163, 184, 0.14)',
  },
  uploadInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    borderRadius: '20px',
    border: '1.5px dashed rgba(14, 116, 144, 0.28)',
    background: 'rgba(248,250,252,0.92)',
    textAlign: 'center',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '12px 0 6px',
    fontFamily: "'Manrope', sans-serif",
  },
  uploadDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '18px',
    lineHeight: 1.6,
  },
  fileInput: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: 0,
    overflow: 'hidden',
  },
  selectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 22px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #0f766e, #0f5f8f)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 10px 24px rgba(15, 118, 110, 0.18)',
    fontFamily: "'Manrope', sans-serif",
  },
  fileBar: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '18px',
    backgroundColor: 'rgba(248,250,252,0.95)',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileIconWrap: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    flexShrink: 0,
  },
  fileName: {
    margin: 0,
    fontWeight: 700,
    fontSize: '14px',
    color: '#0f172a',
    lineHeight: 1.35,
  },
  fileSize: {
    fontSize: '12px',
    color: '#64748b',
    margin: '4px 0 0',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  resetBtn: {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  analyzeBtn: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #0f766e, #0f5f8f)',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '13px',
    fontFamily: "'Manrope', sans-serif",
  },
  analysisShell: {
    display: 'block',
  },
  analysisGrid: {
    display: 'grid',
    gap: '24px',
    alignItems: 'start',
  },
  pipelineColumn: {
    minWidth: 0,
  },
  pipelineStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  analysisColumn: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  pendingCard: {
    background: 'linear-gradient(180deg, rgba(240,249,255,0.7) 0%, #ffffff 100%)',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
  },
  pendingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  pendingTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
  },
  pendingText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.7,
  },
  pendingBadge: {
    padding: '7px 12px',
    borderRadius: '999px',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: '#0369a1',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  errorCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '18px 20px',
    borderRadius: '20px',
    backgroundColor: '#fff1f2',
    border: '1px solid rgba(244, 63, 94, 0.16)',
  },
  errorTitle: {
    margin: '0 0 4px',
    fontWeight: 800,
    fontSize: '16px',
    color: '#9f1239',
    fontFamily: "'Manrope', sans-serif",
  },
  errorMsg: {
    margin: '0 0 12px',
    fontSize: '13px',
    color: '#9f1239',
    lineHeight: 1.6,
  },
  retryBtn: {
    padding: '9px 14px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#be123c',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
};

export default Dashboard;
