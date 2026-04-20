import axios from 'axios';

// Environment-based API configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '120000', 10);
const API_ENV = import.meta.env.VITE_ENV || 'development';

// Log environment at startup
console.log('[API] Configuration:', {
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  environment: API_ENV,
});

// Axios instance with production settings
const api = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
});

// Request interceptor - log outgoing requests
api.interceptors.request.use(
  (config) => {
    console.log('[API] Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      timestamp: new Date().toISOString(),
    });
    return config;
  },
  (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - log responses
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', {
      status: response.status,
      url: response.config.url,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  (error) => {
    console.error('[API] Response Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

/**
 * Convert axios error to user-friendly message
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred';

  // Network errors (no response from server)
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
    return 'Network error. Please check your internet connection and the server status.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return `Request timed out after ${API_TIMEOUT / 1000}s. The PDF might be too large or the server is slow. Please try again.`;
  }

  // Server errors (got response but status >= 400)
  if (error.response) {
    const { status, data } = error.response;
    const serverMessage = data?.error || data?.message || `Server error (${status})`;

    switch (status) {
      case 400:
        return `Invalid request: ${serverMessage}`;
      case 401:
        return 'Unauthorized. Please check your credentials.';
      case 403:
        return 'Access forbidden.';
      case 404:
        return 'API endpoint not found. The server might be down.';
      case 500:
        return `Server error: ${serverMessage}`;
      case 503:
        return 'Server is temporarily unavailable. Please try again later.';
      default:
        return `Error: ${serverMessage}`;
    }
  }

  // Other errors
  return error.message || 'An unexpected error occurred';
}

/**
 * Retry a failed request with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Max retry attempts
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise} Result of function
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[API] Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`[API] Retrying after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Send a PDF file to the backend for multi-agent analysis.
 * With retry logic for network failures.
 * @param {File} file - The PDF file to analyze
 * @returns {Promise} Response with { workflow_plan, selected_tool, analysis }
 * @throws {Error} User-friendly error message
 */
export const analyzeReport = async (file) => {
  try {
    return await retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/analyze/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data;
    }, 3, 1000); // 3 attempts with 1s initial backoff
  } catch (error) {
    const userMessage = getErrorMessage(error);
    console.error('[API] analyzeReport failed:', userMessage);
    throw new Error(userMessage);
  }
};

/**
 * Stream PDF analysis with live pipeline updates via Server-Sent Events.
 * With comprehensive error handling.
 * @param {File} file - The PDF file to analyze
 * @param {Function} onUpdate - Callback function called with each status update
 * @returns {Promise} Final complete response
 * @throws {Error} User-friendly error message
 */
export const analyzeReportStream = async (file, onUpdate) => {
  try {
    return await new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT);

      // Fetch with POST using EventSource-like streaming
      fetch(`${API_BASE}/analyze-stream/`, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            console.error('[API] Stream response error:', errorMsg);
            throw new Error(errorMsg);
          }
          
          if (!response.body) {
            throw new Error('Response body is empty');
          }
          
          return response.body.getReader();
        })
        .then((reader) => {
          const decoder = new TextDecoder();
          let buffer = '';
          let hasError = false;
          let totalChunks = 0;

          const read = () => {
            reader.read()
              .then(({ done, value }) => {
                if (done) {
                  console.log(`[API] Stream complete (${totalChunks} chunks)`);
                  if (!hasError) {
                    resolve(null);
                  }
                  return;
                }

                try {
                  totalChunks += 1;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines[lines.length - 1];

                  for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('data: ')) {
                      try {
                        const jsonStr = line.slice(6);
                        const data = JSON.parse(jsonStr);
                        console.log('[Stream] Update:', data.step || 'unknown');
                        onUpdate(data);
                        
                        if (data.done) {
                          console.log('[API] Stream finished with done=true');
                          resolve(data);
                          return;
                        }
                        
                        if (data.error) {
                          console.error('[API] Stream error:', data.error);
                          hasError = true;
                          resolve(data);
                          return;
                        }
                      } catch (parseErr) {
                        console.error('[API] Failed to parse SSE data:', parseErr, 'Line:', line);
                        // Continue reading, don't fail on parse error
                      }
                    }
                  }
                  
                  read();
                } catch (err) {
                  console.error('[API] Stream reading error:', err);
                  reject(err);
                }
              })
              .catch((readErr) => {
                clearTimeout(timeoutId);
                console.error('[API] Reader error:', readErr);
                reject(readErr);
              });
          };

          read();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            const timeoutMsg = `Request timed out after ${API_TIMEOUT / 1000}s`;
            console.error('[API] Stream timeout:', timeoutMsg);
            reject(new Error(timeoutMsg));
          } else {
            const userMessage = getErrorMessage(error);
            console.error('[API] Stream fetch error:', userMessage);
            reject(new Error(userMessage));
          }
        });
    });
  } catch (error) {
    const userMessage = error.message || getErrorMessage(error);
    console.error('[API] analyzeReportStream failed:', userMessage);
    throw new Error(userMessage);
  }
};

