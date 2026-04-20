const agents = [
  {
    name: 'PDF Reader',
    role: 'Extracts text from the uploaded clinical PDF.',
    input: 'PDF file',
    output: 'Raw extracted text',
    example: 'Input: blood_report.pdf -> Output: extracted clinical text',
    icon: 'description',
  },
  {
    name: 'Context Agent',
    role: 'Stores report context so later agents work from the same source.',
    input: 'Raw extracted text',
    output: 'Shared contextual state',
    example: 'Input: extracted findings -> Output: structured context memory',
    icon: 'memory',
  },
  {
    name: 'Tool Agent',
    role: 'Classifies content and chooses the analysis path.',
    input: 'Raw text',
    output: '"medical_analysis"',
    example: 'Input: lab report text -> Output: medical_analysis',
    icon: 'construction',
  },
  {
    name: 'Planner Agent',
    role: 'Builds the execution workflow from the selected tool and context.',
    input: 'Context + selected tool',
    output: 'Workflow plan',
    example: 'Input: medical_analysis -> Output: step-by-step analysis plan',
    icon: 'hub',
  },
  {
    name: 'Executor Agent',
    role: 'Generates the final clinical analysis content.',
    input: 'Workflow plan + context',
    output: 'Analysis text',
    example: 'Input: planner instructions -> Output: Summary, Findings, Risk, Recommendations',
    icon: 'play_circle',
  },
  {
    name: 'Validator Agent',
    role: 'Checks whether the output is complete and safe to present.',
    input: 'Generated analysis',
    output: 'Validation status',
    example: 'Input: incomplete analysis -> Output: retry_triggered',
    icon: 'verified_user',
  },
];

function Agents() {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Agent Pipeline</h2>
      <p style={styles.subtext}>
        Six specialized AI agents work together to analyze clinical reports.
      </p>

      <div style={styles.grid}>
        {agents.map((agent, i) => (
          <div key={agent.name} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.iconWrap}>
                <span className="material-symbols-outlined" style={{ color: '#005db6', fontSize: '24px' }}>
                  {agent.icon}
                </span>
              </div>
              <span style={styles.stepBadge}>Step {i + 1}</span>
            </div>
            <h3 style={styles.cardTitle}>{agent.name}</h3>

            <div style={styles.detailBlock}>
              <span style={styles.label}>Role</span>
              <p style={styles.value}>{agent.role}</p>
            </div>

            <div style={styles.detailBlock}>
              <span style={styles.label}>Input</span>
              <p style={styles.value}>{agent.input}</p>
            </div>

            <div style={styles.detailBlock}>
              <span style={styles.label}>Output</span>
              <p style={styles.value}>{agent.output}</p>
            </div>

            <div style={styles.exampleCard}>
              <span style={styles.label}>Example</span>
              <p style={styles.exampleText}>{agent.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
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
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 4px 20px rgba(25, 28, 29, 0.04)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    backgroundColor: 'rgba(0, 93, 182, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#727783',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'Manrope', sans-serif",
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#191c1d',
    marginBottom: '16px',
    fontFamily: "'Manrope', sans-serif",
  },
  detailBlock: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#727783',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
    fontFamily: "'Manrope', sans-serif",
  },
  value: {
    fontSize: '14px',
    color: '#424752',
    lineHeight: 1.55,
  },
  exampleCard: {
    padding: '14px',
    borderRadius: '14px',
    backgroundColor: '#f8f9fa',
    marginTop: '6px',
  },
  exampleText: {
    fontSize: '14px',
    color: '#005db6',
    lineHeight: 1.55,
  },
};

export default Agents;
