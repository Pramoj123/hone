"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { GymAvatar } from "@/components/gym-avatar";
import { CreateGymDialog } from "./CreateGymDialog";

interface GymListItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  phone: string | null;
  publicEmail: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  _count: { users: number; branches: number };
}

interface GymsResponse {
  data: GymListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const LIMIT = 15;

function useGymColumns(): Column<GymListItem>[] {
  const router = useRouter();

  return [
    {
      key: "logo",
      header: "",
      headerClassName: "w-12",
      cell: (gym) => (
        <GymAvatar name={gym.name} logoUrl={gym.logoUrl} primaryColor={gym.primaryColor} size="sm" />
      ),
    },
    {
      key: "name",
      header: "Gym",
      cell: (gym) => (
        <div>
          <p className="font-medium text-foreground">{gym.name}</p>
          <p className="text-xs text-muted-foreground">{gym.slug}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (gym) => (
        <span className="text-sm text-muted-foreground">
          {[gym.city, gym.country].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (gym) => (
        <span className="text-sm text-muted-foreground">{gym.phone ?? gym.publicEmail ?? "—"}</span>
      ),
    },
    {
      key: "members",
      header: "Members",
      cell: (gym) => <Badge variant="secondary">{gym._count.users}</Badge>,
    },
    {
      key: "branches",
      header: "Branches",
      cell: (gym) => <Badge variant="outline">{gym._count.branches}</Badge>,
    },
    {
      key: "created",
      header: "Created",
      cell: (gym) => (
        <span className="text-sm text-muted-foreground">
          {new Date(gym.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-16",
      cell: (gym) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/gyms/${gym.slug}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];
}

export default function SuperAdminDashboard(): React.JSX.Element {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const columns = useGymColumns();

  const { data: response, isLoading } = useQuery({
    queryKey: ["gyms", page],
    queryFn: (): Promise<GymsResponse> => authApi.get(`/gyms?page=${page}&limit=${LIMIT}`),
  });

  const gyms = response?.data ?? [];
  const meta = response?.meta;

  return (
    <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gyms</h1>
            {meta && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {meta.total} organisation{meta.total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1" /> Create gym
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={gyms}
          keyExtractor={(gym) => gym.id}
          isLoading={isLoading}
          emptyMessage="No gyms yet. Create the first one."
          onRowClick={(gym) => router.push(`/gyms/${gym.slug}`)}
        />

        {meta && <Pagination meta={meta} onPageChange={setPage} className="mt-4" />}

        <CreateGymDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
  );
}
