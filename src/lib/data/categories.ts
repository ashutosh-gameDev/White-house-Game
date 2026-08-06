import "server-only";
import { apiFetch } from "../api";
import type { Category } from "../types";

export function listCategories(token: string) {
  return apiFetch<Category[]>("/api/categories", { token });
}
