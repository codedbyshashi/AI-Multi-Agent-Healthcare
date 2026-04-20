import { extractRiskLevel } from '../utils/parseAnalysis';

function ValidatorPanel({ result, parsedSections }) {
  if (!result) return null;

  const sections = parsedSections?.sections || {};
  const summaryPresent = Boolean(sections.Summary?.trim());
  const findingsPresent = Boolean(sections['Key Findings']?.trim());
  const recommendationsPresent = Boolean(sections.Recommendations?.trim());
  const riskPresent =
    Boolean(sections['Risk Level']?.trim()) || extractRiskLevel(result.analysis || '') !== 'Unknown';

  let state = 'valid';
  if (!summaryPresent || !riskPresent) state = 'error';
  else if (!findingsPresent || !recommendationsPresent) state = 'partial';

  const config = getStatusConfig(state);
  const checks = [
    { label: 'Summary present', passed: summaryPresent, optional: false },
    { label: 'Findings present', passed: findingsPresent, optional: true },
    { label: 'Risk detected', passed: riskPresent, optional: false },
    { label: 'Recommendations present', passed: recommendationsPresent, optional: true },
  ];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Validator Status</h3>
          <p style={styles.subtext}>Checks based on the current response.</p>
        </div>
        <span style={{ ...styles.badge, ...config.badgeStyle }}>{config.label}</span>
      </div>

      <div style={{ ...styles.messageCard, ...config.messageStyle }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: config.iconColor }}>
          {config.icon}
        </span>
        <p style={styles.messageText}>{config.message}</p>
      </div>

      <div style={styles.list}>
        {checks.map((check) => {
          const variant = check.passed ? 'passed' : check.optional ? 'warning' : 'error';
          return (
            <div key={check.label} style={{ ...styles.item, ...styles[`item_${variant}`] }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '18px',
                  color:
                    variant === 'passed'
                      ? '#15803d'
                      : variant === 'warning'
                      ? '#b45309'
                      : '#b91c1c',
                }}
              >
                {variant === 'passed'
                  ? 'check_circle'
                  : variant === 'warning'
                  ? 'warning'
                  : 'cancel'}
              </span>
              <span style={styles.itemText}>{check.label}</span>
              {variant === 'warning' && <span style={styles.warningTag}>optional</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getStatusConfig(state) {
  if (state === 'valid') {
    return {
      label: 'VALID',
      icon: 'check_circle',
      iconColor: '#15803d',
      message: 'Required validation checks passed.',
      badgeStyle: styles.badgeValid,
      messageStyle: styles.messageValid,
    };
  }

  if (state === 'partial') {
    return {
      label: 'PARTIAL',
      icon: 'warning',
      iconColor: '#b45309',
      message: 'Required checks passed. Optional sections were not returned.',
      badgeStyle: styles.badgePartial,
      messageStyle: styles.messagePartial,
    };
  }

  return {
    label: 'ERROR',
    icon: 'cancel',
    iconColor: '#b91c1c',
    message: 'Required validation checks are missing from the response.',
    badgeStyle: styles.badgeError,
    messageStyle: styles.messageError,
  };
}

const styles = {
  card: {
    background: 'linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(241,245,249,0.98) 100%)',
    borderRadius: '24px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
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
    color: '#64748b',
    lineHeight: 1.55,
  },
  badge: {
    padding: '7px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    border: '1px solid transparent',
    fontFamily: "'Manrope', sans-serif",
  },
  badgeValid: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    color: '#15803d',
    borderColor: 'rgba(22, 163, 74, 0.16)',
  },
  badgePartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#b45309',
    borderColor: 'rgba(245, 158, 11, 0.16)',
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#b91c1c',
    borderColor: 'rgba(239, 68, 68, 0.16)',
  },
  messageCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '16px',
    border: '1px solid transparent',
  },
  messageValid: {
    backgroundColor: 'rgba(240,253,244,0.9)',
    borderColor: 'rgba(22, 163, 74, 0.12)',
  },
  messagePartial: {
    backgroundColor: 'rgba(255,251,235,0.9)',
    borderColor: 'rgba(245, 158, 11, 0.12)',
  },
  messageError: {
    backgroundColor: 'rgba(254,242,242,0.9)',
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  messageText: {
    margin: 0,
    fontSize: '13px',
    color: '#334155',
    lineHeight: 1.55,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid transparent',
  },
  item_passed: {
    backgroundColor: 'rgba(240,253,244,0.7)',
    borderColor: 'rgba(22, 163, 74, 0.1)',
  },
  item_warning: {
    backgroundColor: 'rgba(255,251,235,0.7)',
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  item_error: {
    backgroundColor: 'rgba(254,242,242,0.7)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  itemText: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  warningTag: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

export default ValidatorPanel;
