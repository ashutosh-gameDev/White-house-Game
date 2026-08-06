// Mirrors the shapes returned by RMBackend — see ARCHITECTURE.md §4 and §6.

export type Role = "ADMIN" | "CLIENT";

export interface SafeUser {
  id: number;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  gameCount: number;
}

export interface Game {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  thumbnailPath: string | null;
  bannerPath: string | null;
  unityBuildPath: string;
  isFeatured: boolean;
  displayOrder: number;
  category: { id: number; name: string; slug: string } | null;
}
