import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useOverview() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => (await api.dashboard.getOverview()).data,
  });
}
