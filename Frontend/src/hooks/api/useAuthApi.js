import { useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";

export function useRegisterNgo() {
  return useMutation({
    mutationFn: ({ ngo, admin }) => api.auth.registerNgo(ngo, admin),
  });
}
