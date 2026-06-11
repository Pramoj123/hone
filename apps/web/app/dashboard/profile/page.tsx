"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  phone: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  memberNumber: string | null;
  fitnessGoals: string | null;
  referredBy: string | null;
  createdAt: string;
  memberProfile: {
    height: number | null;
    weight: number | null;
    bloodType: string | null;
    fitnessLevel: string | null;
    primaryGoal: string | null;
    medicalConditions: string[];
    allergies: string[];
    currentMedications: string | null;
    pastInjuries: string | null;
    hasSignedWaiver: boolean;
    waiverSignedAt: string | null;
    physicianName: string | null;
    physicianPhone: string | null;
  } | null;
}

export default function ProfilePage(): React.JSX.Element {
  const { data: me, isLoading } = useQuery<Profile>({
    queryKey: ["me-profile"],
    queryFn: () => authApi.get<Profile>("/auth/me"),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!me) return <div className="p-8 text-muted-foreground">Failed to load profile.</div>;

  const age = me.dateOfBirth
    ? Math.floor((Date.now() - new Date(me.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const memberProfile = me.memberProfile;

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/settings">Edit profile</Link>
        </Button>
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{me.name}</h2>
              <p className="text-sm text-muted-foreground">{me.email}</p>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {me.memberNumber && (
                  <Badge variant="outline" className="font-mono text-xs">{me.memberNumber}</Badge>
                )}
                {me.emailVerifiedAt ? (
                  <Badge className="text-xs bg-green-900/30 text-green-400 border border-green-900/40">
                    Email verified
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-amber-900/30 text-amber-400 border border-amber-900/40">
                    Email not verified
                  </Badge>
                )}
                {memberProfile?.hasSignedWaiver && (
                  <Badge className="text-xs bg-green-900/30 text-green-400 border-green-900/40">Waiver signed</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader><CardTitle>Personal info</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {me.phone && <Row label="Phone" value={me.phone} />}
          {age !== null && <Row label="Age" value={`${age} years`} />}
          {me.gender && <Row label="Gender" value={me.gender} />}
          {me.fitnessGoals && <Row label="Fitness goals" value={me.fitnessGoals} />}
          <Row label="Member since" value={new Date(me.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
          {me.referredBy && <Row label="Referred by" value={me.referredBy} />}
        </CardContent>
      </Card>

      {/* Health profile */}
      {memberProfile && (
        <Card>
          <CardHeader><CardTitle>Health profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBlock label="Height" value={memberProfile.height ? `${memberProfile.height} cm` : null} />
              <StatBlock label="Weight" value={memberProfile.weight ? `${memberProfile.weight} kg` : null} />
              <StatBlock label="Blood type" value={memberProfile.bloodType} />
              <StatBlock label="Fitness level" value={memberProfile.fitnessLevel} />
            </div>

            {memberProfile.primaryGoal && (
              <Row label="Primary goal" value={memberProfile.primaryGoal.replace(/_/g, " ")} />
            )}

            {memberProfile.medicalConditions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Medical conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {memberProfile.medicalConditions.map((condition) => (
                    <span key={condition} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{condition}</span>
                  ))}
                </div>
              </div>
            )}

            {memberProfile.allergies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {memberProfile.allergies.map((allergy) => (
                    <span key={allergy} className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-900/40">{allergy}</span>
                  ))}
                </div>
              </div>
            )}

            {memberProfile.currentMedications && <Row label="Medications" value={memberProfile.currentMedications} />}
            {memberProfile.pastInjuries && <Row label="Past injuries" value={memberProfile.pastInjuries} />}

            {memberProfile.physicianName && (
              <Row
                label="Physician"
                value={`${memberProfile.physicianName}${memberProfile.physicianPhone ? ` · ${memberProfile.physicianPhone}` : ""}`}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-32 shrink-0 text-sm">{label}</span>
      <span className="text-foreground text-sm">{value}</span>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}
