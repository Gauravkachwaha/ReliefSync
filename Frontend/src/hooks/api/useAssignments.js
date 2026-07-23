import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useAssignments() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: async () => (await api.assignments.list()).data || [],
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ needId, volunteerId }) => api.assignments.create(needId, volunteerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["needs"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    },
  });
}

export function useUpdateAssignmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }) => api.assignments.updateStatus(id, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: ["assignments", "me"],
    queryFn: async () => (await api.assignments.getMyAssignments()).data || [],
  });
}

export function useUpdateMyAssignmentProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, status, notes }) =>
      api.assignments.updateMyAssignmentProgress(assignmentId, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", "me"] });
      qc.invalidateQueries({ queryKey: ["volunteers", "me"] });
    },
  });
}
