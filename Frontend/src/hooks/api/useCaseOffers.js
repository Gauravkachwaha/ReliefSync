import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useCaseOffers(status = "PENDING") {
  return useQuery({
    queryKey: ["caseOffers", status],
    queryFn: async () => (await api.ngo.getCaseOffers(status)).data || [],
  });
}

export function useRespondToCaseOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, decision }) => api.ngo.respondToCaseOffer(offerId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caseOffers"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
      qc.invalidateQueries({ queryKey: ["needs"] });
    },
  });
}
