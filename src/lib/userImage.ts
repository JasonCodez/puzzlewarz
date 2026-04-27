const ABSOLUTE_URL = /^https?:\/\//i;

export function normalizeUserImageUrl(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  if (ABSOLUTE_URL.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  if (raw.startsWith('uploads/')) {
    return `/${raw}`;
  }

  if (raw.startsWith('avatars/')) {
    return `/uploads/${raw}`;
  }

  if (!raw.includes('/')) {
    return `/uploads/avatars/${raw}`;
  }

  return `/${raw.replace(/^\/+/, '')}`;
}
