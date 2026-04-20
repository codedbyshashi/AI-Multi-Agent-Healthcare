// Example Error Handling Patterns for Production React Components
// Copy patterns from this file into your components for proper error handling

import { useState, useCallback } from 'react';
import { analyzeReportStream } from '../services/api';

/**
 * Example: Proper error handling in React component
 * Shows loading states, error messages, and retry logic
 */
export function ProperErrorHandlingExample() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Handle file upload with comprehensive error handling
  const handleFileUpload = useCallback(async (file) => {
    if (!file) {
      setError('No file selected');
      return;
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    // Validate file size (e.g., max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[Component] Starting file upload:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Call API with proper error handling
      const response = await analyzeReportStream(file, (update) => {
        // Handle streaming updates
        console.log('[Component] Stream update:', update);
        
        // Update UI with pipeline status
        if (update.pipeline_status) {
          // Show progress to user
          updatePipelineUI(update.pipeline_status);
        }

        // Handle final result
        if (update.done) {
          setResult(update);
        }
      });

      // Success
      setRetryCount(0); // Reset retry count on success
      console.log('[Component] Analysis complete');

    } catch (err) {
      // Error handling
      const errorMsg = err.message || 'Failed to analyze document';
      console.error('[Component] Error:', errorMsg);
      setError(errorMsg);

      // Automatic retry logic (optional)
      const MAX_RETRIES = 3;
      if (retryCount < MAX_RETRIES) {
        console.log(`[Component] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(retryCount + 1);
        
        // Retry after delay
        setTimeout(() => {
          handleFileUpload(file);
        }, 2000); // 2 second delay before retry
      }

    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  // Render error message
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>Error Processing Document</h3>
        <p style={styles.errorMessage}>{error}</p>
        <button 
          onClick={() => setError(null)}
          style={styles.errorButton}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Processing your document...</p>
        {retryCount > 0 && (
          <p style={styles.retryText}>Retry attempt {retryCount}</p>
        )}
      </div>
    );
  }

  // Render result
  if (result) {
    return (
      <div style={styles.resultContainer}>
        <h2>Analysis Complete</h2>
        <p>Your document has been successfully analyzed.</p>
        {/* Display your results here */}
      </div>
    );
  }

  // Render upload form
  return (
    <div style={styles.uploadContainer}>
      <input 
        type="file" 
        accept=".pdf"
        onChange={(e) => handleFileUpload(e.target.files?.[0])}
      />
    </div>
  );
}

// Helper function to update UI with pipeline progress
function updatePipelineUI(status) {
  console.log('Pipeline status:', status);
  // Update your UI components here
}

/**
 * Reusable Error Boundary Component
 * Catches errors in child components
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.errorContainer}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Custom Hook for API calls with error handling
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiFunction) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      return result;
    } catch (err) {
      const message = err.message || 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
}

// Styles for error/loading components
const styles = {
  errorContainer: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
    color: '#991b1b',
  },
  errorIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 600,
  },
  errorMessage: {
    margin: '0 0 12px 0',
    fontSize: '14px',
  },
  errorButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: '#4b5563',
    fontSize: '14px',
  },
  retryText: {
    color: '#f97316',
    fontSize: '12px',
    marginTop: '8px',
  },
  resultContainer: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '16px',
    color: '#065f46',
  },
  uploadContainer: {
    padding: '16px',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    textAlign: 'center',
  },
};

// Add keyframe animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default ProperErrorHandlingExample;
