"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ORG_ADMIN" | "BRANCH_MANAGER" | "TRAINER" | "CLIENT";
  organizationId: string | null;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => authApi.get<CurrentUser>("/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
}
