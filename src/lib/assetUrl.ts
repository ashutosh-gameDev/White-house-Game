const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

/**
 * `thumbnailPath`/`bannerPath` are either a path on RMBackend's own
 * `/uploads` static host (the CRM's upload button) or a full URL to any
 * external host — Cloudflare R2, S3, wherever an admin already hosts images.
 * Same pattern as `unityBuildPath`'s resolveBuildUrl — anything starting
 * `http://`/`https://` is used as-is.
 */
export function resolveAssetUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${BACKEND_URL}${path}`;
}
