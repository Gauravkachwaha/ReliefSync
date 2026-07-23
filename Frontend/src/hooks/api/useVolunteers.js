import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useVolunteers() {
  return useQuery({
    queryKey: ["volunteers"],
    queryFn: async () => (await api.volunteers.list()).data || [],
  });
}

export function useCreateVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (volunteerData) => api.volunteers.create(volunteerData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers"] }),
  });
}

export function useCreateVolunteerAccount() {
  return useMutation({
    mutationFn: ({ id, password }) => api.volunteers.createLoginAccount(id, password),
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["volunteers", "me"],
    queryFn: async () => (await api.volunteers.getMyProfile()).data,
  });
}

export function useUpdateMyAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (availability) => api.volunteers.updateMyAvailability(availability),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", "me"] }),
  });
}
