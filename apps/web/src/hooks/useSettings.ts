import { useQuery } from "@tanstack/react-query";
import type { Settings } from "@crocdesk/shared";
import { apiGet } from "../lib/api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
  });
}
