import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useNgoProfile() {
  return useQuery({
    queryKey: ["ngo", "me"],
    queryFn: async () => (await api.ngo.getProfile()).data,
  });
}

export function useUpdateNgoProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileData) => api.ngo.updateProfile(profileData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ngo", "me"] }),
  });
}
