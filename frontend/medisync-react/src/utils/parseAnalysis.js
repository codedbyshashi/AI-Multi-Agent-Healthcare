/**
 * parseAnalysis.js
 *
 * Safe, case-insensitive parser for LLM-generated analysis output.
 * Extracts structured sections (Summary, Key Findings, Risk Level, Recommendations)
 * and provides a full raw text fallback when parsing fails.
 */

const SECTION_NAMES = ['Summary', 'Key Findings', 'Risk Level', 'Recommendations'];

/**
 * Parse raw LLM analysis text into structured sections.
 *
 * @param {string} raw - Raw analysis text from the backend
 * @returns {{ raw: string, sections: object|null, parseFailed: boolean }}
 */
export function parseAnalysis(raw) {
  if (!raw || typeof raw !== 'string') {
    return { raw: raw || '', sections: null, parseFailed: true };
  }

  const sections = {};

  for (let i = 0; i < SECTION_NAMES.length; i++) {
    const name = SECTION_NAMES[i];
    const nextName = SECTION_NAMES[i + 1] || null;
    sections[name] = extractSection(raw, name, nextName);
  }

  const foundCount = Object.values(sections).filter(Boolean).length;
  const parseFailed = foundCount === 0;

  // If no sections matched, treat the entire output as a plain summary
  if (parseFailed && raw.trim().length > 0) {
    return { raw, sections: { Summary: raw.trim() }, parseFailed: false };
  }

  return { raw, sections, parseFailed };
}

/**
 * Extract a single section from the raw text.
 * Handles variations: "## Summary", "**Summary**", "Summary:", "SUMMARY", etc.
 *
 * @param {string} text - Full analysis text
 * @param {string} name - Section name to find
 * @param {string|null} nextName - Next section name (to determine end boundary)
 * @returns {string|null} Extracted section content, or null if not found
 */
function extractSection(text, name, nextName) {
  // Match: optional markdown headers (## ), optional bold (**), the section name,
  // optional bold close, optional colon/dash, then whitespace
  const startPattern = new RegExp(
    `(?:#{1,3}\\s*)?(?:\\*{1,2})?${escapeRegex(name)}(?:\\*{1,2})?\\s*[:\\-—]?\\s*`,
    'i'
  );

  const startMatch = text.match(startPattern);
  if (!startMatch) return null;

  const startIdx = startMatch.index + startMatch[0].length;
  let endIdx = text.length;

  if (nextName) {
    const endPattern = new RegExp(
      `(?:#{1,3}\\s*)?(?:\\*{1,2})?${escapeRegex(nextName)}(?:\\*{1,2})?\\s*[:\\-—]?\\s*`,
      'i'
    );
    const remaining = text.substring(startIdx);
    const endMatch = remaining.match(endPattern);
    if (endMatch) {
      endIdx = startIdx + endMatch.index;
    }
  }

  const content = text.substring(startIdx, endIdx).trim();
  return content.length > 0 ? content : null;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract risk level from analysis text.
 * Case-insensitive. Returns first match or 'Unknown'.
 *
 * @param {string} text - Raw or parsed analysis text
 * @returns {string} Risk level: 'Low', 'Moderate', 'High', 'Critical', or 'Unknown'
 */
export function extractRiskLevel(text) {
  if (!text || typeof text !== 'string') return 'Unknown';

  const levels = ['critical', 'high', 'moderate', 'medium', 'low'];

  for (const level of levels) {
    // Match patterns like "Risk Level: High", "risk: moderate", "Risk Level - Low"
    const pattern = new RegExp(
      `risk\\s*(?:level)?\\s*[:\\-—]?\\s*${level}`,
      'i'
    );
    if (pattern.test(text)) {
      // Normalize 'medium' → 'Moderate'
      if (level === 'medium') return 'Moderate';
      return level.charAt(0).toUpperCase() + level.slice(1);
    }
  }

  return 'Unknown';
}
