import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 min timeout for large PDFs
});

/**
 * Send a PDF file to the backend for multi-agent analysis.
 * @param {File} file - The PDF file to analyze
 * @returns {Promise} Axios response with { workflow_plan, selected_tool, analysis }
 */
export const analyzeReport = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/analyze/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Stream PDF analysis with live pipeline updates via Server-Sent Events
 * @param {File} file - The PDF file to analyze
 * @param {Function} onUpdate - Callback function called with each status update
 * @returns {Promise} Final complete response
 */
export const analyzeReportStream = (file, onUpdate) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    // Fetch with POST using EventSource-like streaming
    fetch(`${API_BASE}/analyze-stream/`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
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

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              if (!hasError) {
                resolve(null);
              }
              return;
            }

            try {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines[lines.length - 1];

              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6);
                    const data = JSON.parse(jsonStr);
                    console.log('[Stream] Received update:', data);
                    onUpdate(data);
                    if (data.done) {
                      resolve(data);
                      return;
                    }
                    if (data.error) {
                      hasError = true;
                      resolve(data);
                      return;
                    }
                  } catch (parseErr) {
                    console.error('Failed to parse SSE data:', parseErr, line);
                  }
                }
              }
              read();
            } catch (err) {
              console.error('Stream reading error:', err);
              reject(err);
            }
          }).catch((readErr) => {
            console.error('Reader error:', readErr);
            reject(readErr);
          });
        };

        read();
      })
      .catch((error) => {
        console.error('Stream fetch error:', error);
        reject(error);
      });
  });
};

