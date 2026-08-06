import "server-only";
import { apiFetch } from "../api";

export interface PublicSettings {
  "site.contactEmail"?: string;
  "site.maintenanceBanner"?: string;
}

export function getPublicSettings(token: string) {
  return apiFetch<PublicSettings>("/api/settings", { token });
}
