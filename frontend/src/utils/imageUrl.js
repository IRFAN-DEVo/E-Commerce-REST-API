/**
 * Utility to resolve product image URLs across local development and production.
 */
export const getProductImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  // If the image URL contains localhost/127.0.0.1 but the frontend is configured to talk to a remote backend
  if (
    (imagePath.startsWith('http://127.0.0.1:8000') || imagePath.startsWith('http://localhost:8000')) &&
    (apiBase.startsWith('http://') || apiBase.startsWith('https://'))
  ) {
    try {
      const backendOrigin = new URL(apiBase).origin;
      return imagePath.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, backendOrigin);
    } catch {
      // ignore
    }
  }

  // Already an absolute HTTP/HTTPS URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Relative URL (e.g. '/media/products/...')
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const backendOrigin = new URL(apiBase).origin;
      const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `${backendOrigin}${cleanPath}`;
    } catch {
      // ignore
    }
  }

  return imagePath;
};

