import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export function usePublicNgos() {
  return useQuery({
    queryKey: ["public", "ngos"],
    queryFn: async () => (await api.public.getNgos()).data || [],
  });
}

export function useSubmitComplaint() {
  return useMutation({
    mutationFn: ({ text, locationHint, sourceType }) =>
      api.public.submitComplaint(text, locationHint, sourceType),
  });
}

export function useTrackComplaint() {
  return useMutation({
    mutationFn: ({ complaintId, token }) => api.public.trackComplaint(complaintId, token),
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: ({ complaintId, token, rating, comments }) =>
      api.public.submitFeedback(complaintId, token, rating, comments),
  });
}
