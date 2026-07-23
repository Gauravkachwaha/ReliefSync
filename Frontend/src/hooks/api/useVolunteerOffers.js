import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useMyVolunteerOffers(status = "PENDING") {
  return useQuery({
    queryKey: ["volunteerOffers", "me", status],
    queryFn: async () => (await api.volunteerOffers.getMyOffers(status)).data || [],
  });
}

export function useRespondToVolunteerOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, decision }) => api.volunteerOffers.respondToOffer(offerId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteerOffers"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["volunteers", "me"] });
    },
  });
}
