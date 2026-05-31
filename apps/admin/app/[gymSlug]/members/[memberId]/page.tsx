"use client";

import { use, useState, useRef, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface MemberProfile {
  id: string;
  height: number | null;
  weight: number | null;
  bloodType: string | null;
  medicalConditions: string[];
  allergies: string[];
  currentMedications: string | null;
  pastInjuries: string | null;
  pastSurgeries: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  hasSignedWaiver: boolean;
  waiverSignedAt: string | null;
  fitnessLevel: string | null;
  primaryGoal: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  memberNumber: string | null;
  fitnessGoals: string | null;
  referredBy: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  healthNotes: string | null;
  createdAt: string;
  memberProfile: MemberProfile | null;
}

const profileSchema = z.object({
  height: z.coerce.number().optional().or(z.literal("")),
  weight: z.coerce.number().optional().or(z.literal("")),
  bloodType: z.string().optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  currentMedications: z.string().optional(),
  pastInjuries: z.string().optional(),
  pastSurgeries: z.string().optional(),
  physicianName: z.string().optional(),
  physicianPhone: z.string().optional(),
  hasSignedWaiver: z.boolean().optional(),
  waiverSignedAt: z.string().optional(),
  fitnessLevel: z.string().optional(),
  primaryGoal: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const FITNESS_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const PRIMARY_GOALS = [
  "WEIGHT_LOSS", "MUSCLE_GAIN", "ENDURANCE", "FLEXIBILITY", "GENERAL_FITNESS",
];

interface PageProps {
  params: Promise<{ gymSlug: string; memberId: string }>;
}

export default function MemberDetailPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug, memberId } = use(params);
  const [editingProfile, setEditingProfile] = useState(false);
  const queryClient = useQueryClient();

  const { data: member, isLoading } = useQuery<Member>({
    queryKey: ["member", gymSlug, memberId],
    queryFn: () => authApi.get<Member>(`/gyms/${gymSlug}/members/${memberId}`),
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: member?.memberProfile
      ? {
          height: member.memberProfile.height ?? "",
          weight: member.memberProfile.weight ?? "",
          bloodType: member.memberProfile.bloodType ?? "",
          medicalConditions: member.memberProfile.medicalConditions ?? [],
          allergies: member.memberProfile.allergies ?? [],
          currentMedications: member.memberProfile.currentMedications ?? "",
          pastInjuries: member.memberProfile.pastInjuries ?? "",
          pastSurgeries: member.memberProfile.pastSurgeries ?? "",
          physicianName: member.memberProfile.physicianName ?? "",
          physicianPhone: member.memberProfile.physicianPhone ?? "",
          hasSignedWaiver: member.memberProfile.hasSignedWaiver ?? false,
          waiverSignedAt: member.memberProfile.waiverSignedAt
            ? new Date(member.memberProfile.waiverSignedAt).toISOString().split("T")[0]
            : "",
          fitnessLevel: member.memberProfile.fitnessLevel ?? "",
          primaryGoal: member.memberProfile.primaryGoal ?? "",
        }
      : undefined,
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      authApi.patch(`/gyms/${gymSlug}/members/${memberId}/profile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", gymSlug, memberId] });
      setEditingProfile(false);
    },
  });

  if (isLoading) return <MemberSkeleton gymSlug={gymSlug} />;
  if (!member) return <div className="p-8 text-muted-foreground">Member not found.</div>;

  const age = member.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(member.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/${gymSlug}/members`} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Members
        </Link>
        <span>/</span>
        <span className="text-foreground">{member.name}</span>
      </nav>

      {/* Hero */}
      <div className="flex items-start gap-5">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground shrink-0">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{member.name}</h1>
            {member.memberNumber && (
              <Badge variant="outline" className="font-mono text-xs">{member.memberNumber}</Badge>
            )}
            {member.memberProfile?.hasSignedWaiver ? (
              <Badge className="text-xs bg-green-100 text-green-700 border-0">Waiver signed</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-orange-600">Waiver pending</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            {member.phone && <span>{member.phone}</span>}
            {member.gender && <span>{member.gender}</span>}
            {age !== null && <span>{age} years old</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Member details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <InfoRow label="Joined" value={new Date(member.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
            {member.referredBy && <InfoRow label="Referred by" value={member.referredBy} />}
            {member.fitnessGoals && <InfoRow label="Goals" value={member.fitnessGoals} />}
            {member.healthNotes && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-medium text-yellow-800 mb-1">Staff note</p>
                <p className="text-xs text-yellow-900">{member.healthNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Emergency contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {member.emergencyContactName ? (
              <>
                <InfoRow label="Name" value={member.emergencyContactName} />
                {member.emergencyContactPhone && (
                  <InfoRow label="Phone" value={member.emergencyContactPhone} />
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No emergency contact added.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health Profile */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Health profile</CardTitle>
          {!editingProfile && (
            <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfile ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => profileMutation.mutate(data))}
                className="space-y-6"
              >
                <Section title="Physical stats">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="height" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl><Input type="number" placeholder="175" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl><Input type="number" placeholder="72" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bloodType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood type</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select…</option>
                            {BLOOD_TYPES.map((bt) => (
                              <option key={bt} value={bt}>{bt}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>

                <Section title="Medical">
                  <FormField control={form.control} name="medicalConditions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical conditions</FormLabel>
                      <TagInput
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Type and press Enter…"
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="allergies" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <TagInput
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="e.g. Penicillin, Latex…"
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentMedications" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current medications</FormLabel>
                      <FormControl>
                        <textarea
                          rows={2}
                          className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          placeholder="Levothyroxine 50mcg daily…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="pastInjuries" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Past injuries</FormLabel>
                        <FormControl>
                          <textarea
                            rows={2}
                            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            placeholder="Right knee ACL (2021)…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="pastSurgeries" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Past surgeries</FormLabel>
                        <FormControl>
                          <textarea
                            rows={2}
                            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            placeholder="Appendectomy (2019)…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="physicianName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physician name</FormLabel>
                        <FormControl><Input placeholder="Dr. Jane Smith" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="physicianPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physician phone</FormLabel>
                        <FormControl><Input placeholder="+91 98100 12345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>

                <Section title="Waiver & Fitness baseline">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="waiverSignedAt" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waiver signed date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hasSignedWaiver" render={({ field }) => (
                      <FormItem className="flex items-end gap-2 pb-1">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Waiver signed</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fitnessLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fitness level</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select…</option>
                            {FITNESS_LEVELS.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="primaryGoal" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary goal</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select…</option>
                            {PRIMARY_GOALS.map((g) => (
                              <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? "Saving…" : "Save health profile"}
                  </Button>
                </div>

                {profileMutation.error && (
                  <p className="text-sm text-destructive">
                    {(profileMutation.error as Error).message}
                  </p>
                )}
              </form>
            </Form>
          ) : (
            <ProfileView profile={member.memberProfile} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileView({ profile }: { profile: MemberProfile | null }): React.JSX.Element {
  if (!profile) {
    return <p className="text-sm text-muted-foreground">No health profile recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Height" value={profile.height ? `${profile.height} cm` : undefined} />
        <Stat label="Weight" value={profile.weight ? `${profile.weight} kg` : undefined} />
        <Stat label="Blood type" value={profile.bloodType ?? undefined} />
        <Stat label="Fitness level" value={profile.fitnessLevel ?? undefined} />
      </div>

      {profile.medicalConditions.length > 0 && (
        <ProfileRow label="Medical conditions">
          <div className="flex flex-wrap gap-1.5">
            {profile.medicalConditions.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        </ProfileRow>
      )}
      {profile.allergies.length > 0 && (
        <ProfileRow label="Allergies">
          <div className="flex flex-wrap gap-1.5">
            {profile.allergies.map((a) => (
              <Badge key={a} variant="outline" className="text-xs text-red-700 border-red-200">{a}</Badge>
            ))}
          </div>
        </ProfileRow>
      )}
      {profile.currentMedications && (
        <ProfileRow label="Medications" value={profile.currentMedications} />
      )}
      {profile.pastInjuries && (
        <ProfileRow label="Past injuries" value={profile.pastInjuries} />
      )}
      {profile.physicianName && (
        <ProfileRow
          label="Physician"
          value={`${profile.physicianName}${profile.physicianPhone ? ` · ${profile.physicianPhone}` : ""}`}
        />
      )}
      {profile.primaryGoal && (
        <ProfileRow label="Primary goal" value={profile.primaryGoal.replace(/_/g, " ")} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children ?? <p className="text-sm text-foreground">{value}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function MemberSkeleton({ gymSlug }: { gymSlug: string }): React.JSX.Element {
  return (
    <div className="p-8 max-w-5xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start gap-5">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
