import { useEffect, useState } from 'react';
import { PIPELINE_AGENTS } from '../constants/pipeline';

const STEP_LABELS = [
  'File Selected',
  'API Call Started',
  'Tool Identified',
  'Workflow Plan Received',
  'Analysis Received',
  'Validation Completed',
];

function getStepState(index, currentStep, status) {
  const normalizedStep = Math.max(currentStep - 1, -1);
  const isCompleted = status === 'completed';

  if (status === 'error') {
    if (index < normalizedStep) return 'done';
    if (index === normalizedStep) return 'error';
    return 'idle';
  }

  if (isCompleted) {
    return index <= normalizedStep ? 'done' : 'idle';
  }

  if (index < normalizedStep) return 'done';
  if (index === normalizedStep) return 'active';
  return 'idle';
}

function PipelineVisualizer({
  activeStep = -1,
  status = 'idle',
  message = 'Select a PDF to begin.',
  response = null,
}) {
  const [currentStep, setCurrentStep] = useState(Math.max(activeStep + 1, 1));

  console.log('CURRENT STEP:', currentStep);

  useEffect(() => {
    if (!response?.pipeline_status) return;

    const nextStep = getStepFromStatus(response.pipeline_status);
    setCurrentStep(nextStep);
  }, [JSON.stringify(response?.pipeline_status)]);

  useEffect(() => {
    if (response?.pipeline_status) return;
    if (activeStep < 0) return;
    setCurrentStep(activeStep + 1);
  }, [activeStep, response?.pipeline_status]);

  function getStepFromStatus(status) {
    if (!status) return 2;

    if (status.validator === 'success') return 6;
    if (status.executor === 'success') return 5;
    if (status.planner === 'success') return 4;
    if (status.tool === 'success') return 3;

    return 2;
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Agent Pipeline</h3>
          <p style={styles.subtext}>Real-time execution synced to the current backend response.</p>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            ...(status === 'error'
              ? styles.statusError
              : status === 'running'
              ? styles.statusRunning
              : status === 'completed'
              ? styles.statusCompleted
              : currentStep >= 1
              ? styles.statusReady
              : styles.statusIdle),
          }}
        >
          {status === 'error'
            ? 'Error'
            : status === 'running'
            ? 'Active'
            : status === 'completed'
            ? 'Completed'
            : currentStep >= 1
            ? 'Ready'
            : 'Waiting'}
        </span>
      </div>

      <div style={styles.container}>
        <div style={styles.list}>
          {PIPELINE_AGENTS.map((agent, index) => {
            const stepState = getStepState(index, currentStep, status);
            const isDone = stepState === 'done';
            const isActive = stepState === 'active';
            const isError = stepState === 'error';

            return (
              <div
                key={agent.key}
                style={{
                  ...styles.item,
                  ...(isDone ? styles.itemDone : {}),
                  ...(isActive ? styles.itemActive : {}),
                  ...(isError ? styles.itemError : {}),
                }}
              >
                <div
                  style={{
                    ...styles.marker,
                    ...(isDone ? styles.markerDone : {}),
                    ...(isActive ? styles.markerActive : {}),
                    ...(isError ? styles.markerError : {}),
                  }}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined" style={styles.markerIcon}>check</span>
                  ) : isError ? (
                    <span className="material-symbols-outlined" style={styles.markerIcon}>close</span>
                  ) : (
                    <span style={styles.markerNumber}>{index + 1}</span>
                  )}
                </div>

                <div
                  style={{
                    ...styles.iconWrap,
                    ...(isDone ? styles.iconWrapDone : {}),
                    ...(isActive ? styles.iconWrapActive : {}),
                    ...(isError ? styles.iconWrapError : {}),
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      ...styles.icon,
                      ...(isDone ? styles.iconDone : {}),
                      ...(isActive ? styles.iconActive : {}),
                      ...(isError ? styles.iconError : {}),
                    }}
                  >
                    {agent.icon}
                  </span>
                </div>

                <div style={styles.textWrap}>
                  <h4 style={styles.stepTitle}>{STEP_LABELS[index]}</h4>
                  <p style={styles.stepDescription}>{agent.role}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={styles.footer}>{message}</p>
    </div>
  );
}

const styles = {
  card: {
    background: 'linear-gradient(180deg, rgba(240,249,255,0.9) 0%, #ffffff 100%)',
    borderRadius: '24px',
    padding: '22px',
    border: '1px solid rgba(148, 163, 184, 0.14)',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
  },
  subtext: {
    margin: '6px 0 0',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#64748b',
  },
  statusBadge: {
    padding: '7px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: "'Manrope', sans-serif",
    flexShrink: 0,
  },
  statusIdle: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: '#64748b',
  },
  statusReady: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    color: '#15803d',
  },
  statusCompleted: {
    backgroundColor: 'rgba(22, 163, 74, 0.14)',
    color: '#15803d',
  },
  statusRunning: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    color: '#1d4ed8',
  },
  statusError: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    color: '#be123c',
  },
  container: {
    maxHeight: '70vh',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    borderRadius: '18px',
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(148, 163, 184, 0.14)',
  },
  itemDone: {
    backgroundColor: 'rgba(240, 253, 244, 0.95)',
    borderColor: 'rgba(34, 197, 94, 0.18)',
  },
  itemActive: {
    backgroundColor: 'rgba(239, 246, 255, 0.95)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.08)',
  },
  itemError: {
    backgroundColor: 'rgba(255, 241, 242, 0.95)',
    borderColor: 'rgba(244, 63, 94, 0.18)',
  },
  marker: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  markerDone: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
  },
  markerActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  markerError: {
    backgroundColor: '#e11d48',
    color: '#ffffff',
  },
  markerIcon: {
    fontSize: '16px',
    fontVariationSettings: "'FILL' 1",
  },
  markerNumber: {
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: "'Manrope', sans-serif",
  },
  iconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapDone: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  iconWrapError: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
  },
  icon: {
    fontSize: '20px',
    color: '#94a3b8',
  },
  iconDone: {
    color: '#15803d',
  },
  iconActive: {
    color: '#2563eb',
  },
  iconError: {
    color: '#e11d48',
  },
  textWrap: {
    minWidth: 0,
    flex: 1,
  },
  stepTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f172a',
    fontFamily: "'Manrope', sans-serif",
  },
  stepDescription: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.55,
  },
  footer: {
    margin: '16px 0 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.6,
  },
};

export default PipelineVisualizer;
