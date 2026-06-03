"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { authApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientCard, type MyClient } from "@/components/client-card";

interface PagedResponse {
  data: MyClient[];
  total: number;
  page: number;
  limit: number;
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function MyClientsPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function handleSearchChange(value: string): void {
    setSearch(value);
    clearTimeout((window as Window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as Window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
      () => setDebouncedSearch(value),
      300,
    );
  }

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ["my-clients", gymSlug, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return authApi.get<PagedResponse>(`/gyms/${gymSlug}/members/my-clients?${params}`);
    },
  });

  const clients = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${total} client${total !== 1 ? "s" : ""} assigned to you`}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search clients…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        /* Empty state */
        <div className="py-24 flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-2xl text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground text-sm">No clients assigned yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Clients appear here once you assign them a workout program.
          </p>
        </div>
      ) : (
        /* Client grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} gymSlug={gymSlug} />
          ))}
        </div>
      )}
    </div>
  );
}
