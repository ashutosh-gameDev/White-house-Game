import "server-only";
import { apiFetch } from "../api";
import type { Game } from "../types";

export function listGames(token: string, query: { category?: string; featured?: boolean } = {}) {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.featured !== undefined) params.set("featured", String(query.featured));
  const qs = params.toString();
  return apiFetch<Game[]>(`/api/games${qs ? `?${qs}` : ""}`, { token });
}

export function getGameBySlug(token: string, slug: string) {
  return apiFetch<Game>(`/api/games/${slug}`, { token });
}
