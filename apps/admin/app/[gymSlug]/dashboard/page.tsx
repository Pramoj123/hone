"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, GitBranch, TrendingUp } from "lucide-react";
import { authApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalMembers: number;
  activeTrainers: number;
  branchCount: number;
  newMembersThisMonth: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  memberNumber: string | null;
  branchId: string | null;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function GymDashboard({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["stats", gymSlug],
    queryFn: () => authApi.get<Stats>(`/gyms/${gymSlug}/stats`),
  });

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["members", gymSlug],
    queryFn: () => authApi.get<Member[]>(`/gyms/${gymSlug}/members`),
  });

  const recentMembers = members?.slice(0, 8) ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Overview for <span className="font-medium text-foreground">{gymSlug}</span>
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          label="Total members"
          value={stats?.totalMembers}
          isLoading={statsLoading}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          label="New this month"
          value={stats?.newMembersThisMonth}
          isLoading={statsLoading}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-muted-foreground" />}
          label="Active trainers"
          value={stats?.activeTrainers}
          isLoading={statsLoading}
        />
        <StatCard
          icon={<GitBranch className="h-5 w-5 text-muted-foreground" />}
          label="Branches"
          value={stats?.branchCount}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent members */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent members</h2>
        <Card>
          <CardContent className="p-0">
            {membersLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentMembers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No members yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {m.memberNumber && (
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {m.memberNumber}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(m.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  isLoading: boolean;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold text-foreground">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
