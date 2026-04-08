export const getProxiedUrl = (url: string | undefined | null) => {
  if (!url) return '';
  if (url.includes('firebasestorage.googleapis.com')) {
    return url.replace('https://firebasestorage.googleapis.com', '/api/proxy-storage');
  }
  return url;
};
