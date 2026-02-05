import path from 'path';

export function getUploadsRootDir(): string {
  // In production (Render), set UPLOADS_DIR to a persistent disk mount.
  // In development, default to Next's public folder for convenience.
  const configured = process.env.UPLOADS_DIR;
  if (configured && configured.trim()) return path.resolve(configured.trim());
  return path.join(process.cwd(), 'public', 'uploads');
}

export function resolveUploadsPath(...relativeParts: string[]): string {
  const root = getUploadsRootDir();
  const resolved = path.resolve(root, ...relativeParts);

  // Prevent path traversal.
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error('Invalid uploads path');
  }

  return resolved;
}

export function resolvePublicPath(...relativeParts: string[]): string {
  const root = path.join(process.cwd(), 'public');
  return path.resolve(root, ...relativeParts);
}
