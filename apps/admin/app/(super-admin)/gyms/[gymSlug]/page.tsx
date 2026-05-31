"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Globe, Clock, Calendar, Users, GitBranch } from "lucide-react";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GymAvatar } from "@/components/gym-avatar";

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  timezone: string;
}

interface GymDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  // Location
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  // Contact
  phone: string | null;
  publicEmail: string | null;
  website: string | null;
  // Operational
  timezone: string;
  currency: string;
  openingHours: string | null;
  // Branding
  logoUrl: string | null;
  primaryColor: string | null;
  // Meta
  createdAt: string;
  branches: Branch[];
  _count: { users: number; branches: number };
}

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function GymDetailPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);

  const { data: gym, isLoading } = useQuery({
    queryKey: ["gym", gymSlug],
    queryFn: (): Promise<GymDetail> => authApi.get(`/gyms/${gymSlug}`),
  });

  if (isLoading) return <GymDetailSkeleton />;
  if (!gym) return <div className="p-8 text-muted-foreground">Gym not found.</div>;

  const fullAddress = [gym.address, gym.city, gym.state, gym.postalCode, gym.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Gyms</Link>
          <span>/</span>
          <span className="text-foreground">{gym.name}</span>
        </nav>

        {/* Hero */}
        <div className="flex items-start gap-5">
          <GymAvatar name={gym.name} logoUrl={gym.logoUrl} primaryColor={gym.primaryColor} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{gym.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">{gym.slug}</Badge>
            </div>
            {gym.description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">{gym.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <StatPill icon={<Users className="h-3.5 w-3.5" />} label={`${gym._count.users} members`} />
              <StatPill icon={<GitBranch className="h-3.5 w-3.5" />} label={`${gym._count.branches} ${gym._count.branches === 1 ? "branch" : "branches"}`} />
              <StatPill icon={<Calendar className="h-3.5 w-3.5" />} label={`Joined ${new Date(gym.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`} />
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {fullAddress ? (
                <p className="text-foreground">{fullAddress}</p>
              ) : (
                <p className="text-muted-foreground">No address added</p>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" /> Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {gym.phone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} value={gym.phone} />}
              {gym.publicEmail && (
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} value={
                  <a href={`mailto:${gym.publicEmail}`} className="hover:underline text-foreground">{gym.publicEmail}</a>
                } />
              )}
              {gym.website && (
                <InfoRow icon={<Globe className="h-3.5 w-3.5" />} value={
                  <a href={gym.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-foreground">{gym.website.replace(/^https?:\/\//, "")}</a>
                } />
              )}
              {!gym.phone && !gym.publicEmail && !gym.website && (
                <p className="text-muted-foreground">No contact info added</p>
              )}
            </CardContent>
          </Card>

          {/* Operational */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Operational
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <InfoRow label="Timezone" value={gym.timezone} />
              <InfoRow label="Currency" value={gym.currency} />
              {gym.openingHours && <InfoRow label="Hours" value={gym.openingHours} />}
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="h-4 w-4 rounded-sm border border-border inline-block" style={{ backgroundColor: gym.primaryColor ?? "#111827" }} />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {gym.primaryColor && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded border border-border" style={{ backgroundColor: gym.primaryColor }} />
                  <span className="font-mono text-muted-foreground">{gym.primaryColor}</span>
                </div>
              )}
              {!gym.primaryColor && !gym.logoUrl && (
                <p className="text-muted-foreground">No branding configured</p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Branches */}
        {gym.branches.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" /> Branches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gym.branches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{branch.name}</span>
                      {branch.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{branch.timezone}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {label}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label?: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      {label && <span className="shrink-0 text-foreground/60 w-16">{label}</span>}
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function GymDetailSkeleton(): React.JSX.Element {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
