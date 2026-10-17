// client/src/utils/imageUrl.js

/**
 * Resolves an image URL safely:
 * - If it's already an absolute URL (http://, https://, data:, blob:), return as is.
 * - If it's a relative /uploads path, prefix with backend origin if configured with remote API.
 * - Handles fallback gracefully.
 *
 * @param {string} url - Image path or URL
 * @param {string} [fallback=''] - Optional fallback image URL
 * @returns {string} Fully resolved image URL
 */
export const resolveImageUrl = (url, fallback = '') => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Windows / local drive path (e.g. C:\... or file:///) - cannot be loaded directly by browser
  if (isLocalDiskPath(trimmed)) {
    return fallback;
  }

  if (trimmed.startsWith('/uploads')) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && !apiUrl.startsWith('/')) {
      const backendOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');
      return `${backendOrigin}${trimmed}`;
    }
    return trimmed;
  }

  return trimmed;
};

/**
 * Checks if a string looks like a local Windows or POSIX filesystem path.
 *
 * @param {string} url - Candidate string
 * @returns {boolean} True if string is a local computer path
 */
export const isLocalDiskPath = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    /^[a-zA-Z]:\\/.test(trimmed) ||
    trimmed.startsWith('file://') ||
    /^\/[a-zA-Z0-9_\-.]+\/[a-zA-Z0-9_\-.]+\//.test(trimmed)
  );
};
