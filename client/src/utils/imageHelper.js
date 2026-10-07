/**
 * Image URL normalization and error resilience utilities
 * Automatically transforms cloud share links (Google Drive, Dropbox, GitHub, Imgur)
 * into directly streamable image URLs and provides fallback handling.
 */

export function normalizePhotoUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // Already a base64 data URL or blob URL
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url.replace(/\s+/g, '');
  }

  // Google Drive links:
  // e.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // e.g. https://drive.google.com/open?id=FILE_ID
  // e.g. https://drive.google.com/uc?id=FILE_ID
  // e.g. https://docs.google.com/file/d/FILE_ID
  const gDriveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // Dropbox links:
  // e.g. https://www.dropbox.com/s/xyz/photo.jpg?dl=0
  if (url.includes('dropbox.com')) {
    if (url.includes('dl=0')) {
      return url.replace('dl=0', 'raw=1');
    }
    if (!url.includes('raw=1')) {
      return url.includes('?') ? `${url}&raw=1` : `${url}?raw=1`;
    }
    return url;
  }

  // GitHub file links:
  // e.g. https://github.com/user/repo/blob/main/photo.png
  const githubMatch = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
  if (githubMatch) {
    const [, owner, repo, branch, path] = githubMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  // Imgur page links:
  // e.g. https://imgur.com/abc1234
  const imgurMatch = url.match(/^https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch) {
    return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
  }

  // Postimages page links:
  const postimgMatch = url.match(/^https?:\/\/postimg\.cc\/([a-zA-Z0-9]+)$/);
  if (postimgMatch) {
    return `https://i.postimg.cc/${postimgMatch[1]}/image.jpg`;
  }

  return url;
}

export function getGoogleDriveAlternateUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return null;
}

/**
 * Handles image load errors gracefully.
 * 1. If it's a Google Drive thumbnail that failed, tries the alternate lh3 Google CDN link.
 * 2. If all fails, uses a clean white fallback avatar with student initial and subtle border.
 */
export function handleImageError(e, studentName = 'Student') {
  const currentSrc = e.currentTarget.getAttribute('src') || '';
  const altSrc = getGoogleDriveAlternateUrl(currentSrc);

  // If already tried alt or no alt, fallback to clean offline white avatar
  if (altSrc && !e.currentTarget.dataset.triedAlt) {
    e.currentTarget.dataset.triedAlt = 'true';
    e.currentTarget.src = altSrc;
    return;
  }

  e.currentTarget.onerror = null;
  const initial = (studentName || 'S').trim().charAt(0).toUpperCase() || 'S';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="%230f172a">${initial}</text></svg>`;
  e.currentTarget.src = `data:image/svg+xml;utf8,${svg}`;
}
