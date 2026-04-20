import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: 'home_health' },
  { to: '/agents', label: 'Agents', icon: 'smart_toy' },
  { to: '/history', label: 'History', icon: 'folder_managed' },
]

function Navbar() {
  return (
    <header style={styles.header}>
      {/* Logo / Brand */}
      <div style={styles.brand}>
        <span
          className="material-symbols-outlined"
          style={{ color: '#005db6', fontSize: '28px' }}
        >
          clinical_notes
        </span>
        <h1 style={styles.title}>MediSync AI</h1>
      </div>

      {/* Navigation Links */}
      <nav style={styles.nav}>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            style={({ isActive }) => ({
              ...styles.link,
              color: isActive ? '#005db6' : '#64748b',
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? 'rgba(0, 93, 182, 0.08)' : 'transparent',
            })}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '20px',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              {link.icon}
            </span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backgroundColor: 'rgba(248, 249, 250, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    fontFamily: "'Manrope', sans-serif",
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, #005db6, #00478d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    fontFamily: "'Manrope', sans-serif",
  },
}

export default Navbar
