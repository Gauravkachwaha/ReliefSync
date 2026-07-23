import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await api.reports.list()).data || [],
  });
}

export function useReport(id) {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: async () => (await api.reports.getById(id)).data,
    enabled: !!id,
  });
}

export function useSubmitTextReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, content }) => api.reports.submitText(title, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useSubmitPdfReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, file }) => api.reports.submitPdf(title, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}
