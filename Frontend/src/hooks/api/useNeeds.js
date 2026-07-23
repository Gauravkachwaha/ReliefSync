import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useNeeds() {
  return useQuery({
    queryKey: ["needs"],
    queryFn: async () => (await api.needs.list()).data || [],
  });
}

export function useRecommendations(needId) {
  return useQuery({
    queryKey: ["matching", "recommendations", needId],
    queryFn: () => api.matching.getRecommendations(needId),
    enabled: !!needId,
  });
}
