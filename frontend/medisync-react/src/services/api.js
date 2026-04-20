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
