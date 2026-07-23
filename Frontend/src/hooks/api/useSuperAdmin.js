import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useNgoQueue(status = "PENDING") {
  return useQuery({
    queryKey: ["superAdmin", "ngos", status],
    queryFn: async () => (await api.superAdmin.getNgoVerificationQueue(status)).data || [],
  });
}

export function useUpdateNgoVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ngoId, verificationStatus }) =>
      api.superAdmin.updateNgoVerification(ngoId, verificationStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superAdmin", "ngos"] });
      qc.invalidateQueries({ queryKey: ["superAdmin", "analytics"] });
    },
  });
}

export function useSpamQueue() {
  return useQuery({
    queryKey: ["superAdmin", "spam"],
    queryFn: async () => (await api.superAdmin.getSpamReviewQueue()).data || [],
  });
}

export function useResolveSpam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, decision }) => api.superAdmin.resolveSpamReview(complaintId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superAdmin", "spam"] });
      qc.invalidateQueries({ queryKey: ["superAdmin", "analytics"] });
    },
  });
}

export function useEscalations(status = "OPEN") {
  return useQuery({
    queryKey: ["superAdmin", "escalations", status],
    queryFn: async () => (await api.superAdmin.getEscalations(status)).data || [],
  });
}

export function useResolveEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ escalationId, resolvedNote }) =>
      api.superAdmin.resolveEscalation(escalationId, resolvedNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["superAdmin", "escalations"] }),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["superAdmin", "auditLogs"],
    queryFn: async () => (await api.superAdmin.getAuditLogs()).data,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["superAdmin", "analytics"],
    queryFn: async () => (await api.superAdmin.getAnalytics()).data,
  });
}
