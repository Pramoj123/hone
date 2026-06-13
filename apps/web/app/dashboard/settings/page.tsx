"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Building2, Loader2, AlertTriangle, ArrowRightLeft } from "lucide-react";

interface MemberProfile {
  height: number | null;
  weight: number | null;
  bloodType: string | null;
  fitnessLevel: string | null;
  primaryGoal: string | null;
  medicalConditions: string[];
  allergies: string[];
  currentMedications: string | null;
  pastInjuries: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  hasSignedWaiver: boolean;
}

interface Me {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  fitnessGoals: string | null;
  memberProfile: MemberProfile | null;
}

const personalSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  fitnessGoals: z.string().optional().or(z.literal("")),
});

const healthSchema = z.object({
  height: z.string().optional().or(z.literal("")),
  weight: z.string().optional().or(z.literal("")),
  bloodType: z.string().optional().or(z.literal("")),
  fitnessLevel: z.string().optional().or(z.literal("")),
  primaryGoal: z.string().optional().or(z.literal("")),
  medicalConditions: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  currentMedications: z.string().optional().or(z.literal("")),
  pastInjuries: z.string().optional().or(z.literal("")),
  physicianName: z.string().optional().or(z.literal("")),
  physicianPhone: z.string().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PersonalForm = z.infer<typeof personalSchema>;
type HealthForm = z.infer<typeof healthSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const FITNESS_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const PRIMARY_GOALS: { value: string; label: string }[] = [
  { value: "MUSCLE_GAIN",     label: "Muscle gain"     },
  { value: "WEIGHT_LOSS",     label: "Weight loss"     },
  { value: "ENDURANCE",       label: "Endurance"       },
  { value: "STRENGTH",        label: "Strength"        },
  { value: "FLEXIBILITY",     label: "Flexibility"     },
  { value: "GENERAL_FITNESS", label: "General fitness" },
];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-muted-foreground block mb-1.5">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function NativeSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className ?? ""}`}
      {...props}
    />
  );
}

function SavedBadge() {
  return (
    <span className="flex items-center gap-1 text-sm text-green-400">
      <Check className="h-4 w-4" /> Saved
    </span>
  );
}

export default function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [personalSaved, setPersonalSaved] = useState(false);
  const [healthSaved, setHealthSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => authApi.get<Me>("/auth/me"),
  });

  const memberProfile = me?.memberProfile;

  const personalForm = useForm<PersonalForm>({
    resolver: zodResolver(personalSchema),
    values: me
      ? {
          name: me.name,
          phone: me.phone ?? "",
          dateOfBirth: me.dateOfBirth ? me.dateOfBirth.slice(0, 10) : "",
          gender: me.gender ?? "",
          fitnessGoals: me.fitnessGoals ?? "",
        }
      : undefined,
  });

  const healthForm = useForm<HealthForm>({
    resolver: zodResolver(healthSchema),
    values: memberProfile !== undefined
      ? {
          height: memberProfile?.height != null ? String(memberProfile.height) : "",
          weight: memberProfile?.weight != null ? String(memberProfile.weight) : "",
          bloodType: memberProfile?.bloodType ?? "",
          fitnessLevel: memberProfile?.fitnessLevel ?? "",
          primaryGoal: memberProfile?.primaryGoal ?? "",
          medicalConditions: memberProfile?.medicalConditions.join(", ") ?? "",
          allergies: memberProfile?.allergies.join(", ") ?? "",
          currentMedications: memberProfile?.currentMedications ?? "",
          pastInjuries: memberProfile?.pastInjuries ?? "",
          physicianName: memberProfile?.physicianName ?? "",
          physicianPhone: memberProfile?.physicianPhone ?? "",
        }
      : undefined,
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const personalMutation = useMutation({
    mutationFn: (data: PersonalForm) => authApi.patch("/auth/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      setPersonalSaved(true);
      setTimeout(() => setPersonalSaved(false), 2500);
      toast.success("Personal info updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const healthMutation = useMutation({
    mutationFn: (data: HealthForm) => {
      const split = (val: string | undefined) =>
        val ? val.split(",").map((item) => item.trim()).filter(Boolean) : [];
      return authApi.patch("/auth/me/health-profile", {
        height: data.height ? parseFloat(data.height) : undefined,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        bloodType: data.bloodType || undefined,
        fitnessLevel: data.fitnessLevel || undefined,
        primaryGoal: data.primaryGoal || undefined,
        medicalConditions: split(data.medicalConditions),
        allergies: split(data.allergies),
        currentMedications: data.currentMedications || undefined,
        pastInjuries: data.pastInjuries || undefined,
        physicianName: data.physicianName || undefined,
        physicianPhone: data.physicianPhone || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      setHealthSaved(true);
      setTimeout(() => setHealthSaved(false), 2500);
      toast.success("Health profile updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.patch("/auth/me/password", { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
      toast.success("Password updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-lg space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Personal info */}
      <Card>
        <CardHeader><CardTitle>Personal info</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={personalForm.handleSubmit((data) => personalMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <FieldLabel>Display name</FieldLabel>
              <Input className="text-base" {...personalForm.register("name")} />
              <FieldError message={personalForm.formState.errors.name?.message} />
            </div>

            <div>
              <FieldLabel>Email</FieldLabel>
              <div className="flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                {me?.email ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contact your trainer to update your email.</p>
            </div>

            <div>
              <FieldLabel>Phone number</FieldLabel>
              <Input className="text-base" type="tel" placeholder="+91 98100 00000" {...personalForm.register("phone")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Date of birth</FieldLabel>
                <Input className="text-base" type="date" {...personalForm.register("dateOfBirth")} />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <NativeSelect {...personalForm.register("gender")}>
                  <option value="">Select…</option>
                  {GENDER_OPTIONS.map((genderOption) => (
                    <option key={genderOption} value={genderOption}>{genderOption}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div>
              <FieldLabel>Fitness goals</FieldLabel>
              <Input className="text-base" placeholder="e.g. Build muscle, run a 5K" {...personalForm.register("fitnessGoals")} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={personalMutation.isPending}>
                {personalMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
              {personalSaved && <SavedBadge />}
            </div>
            {personalMutation.error && (
              <p className="text-sm text-destructive">{(personalMutation.error as Error).message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Health profile */}
      <Card>
        <CardHeader><CardTitle>Health profile</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={healthForm.handleSubmit((data) => healthMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Height (cm)</FieldLabel>
                <Input className="text-base" type="number" step="0.1" placeholder="175" {...healthForm.register("height")} />
              </div>
              <div>
                <FieldLabel>Weight (kg)</FieldLabel>
                <Input className="text-base" type="number" step="0.1" placeholder="70" {...healthForm.register("weight")} />
              </div>
              <div>
                <FieldLabel>Blood type</FieldLabel>
                <NativeSelect {...healthForm.register("bloodType")}>
                  <option value="">Select…</option>
                  {BLOOD_TYPES.map((bloodType) => (
                    <option key={bloodType} value={bloodType}>{bloodType}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fitness level</FieldLabel>
                <NativeSelect {...healthForm.register("fitnessLevel")}>
                  <option value="">Select…</option>
                  {FITNESS_LEVELS.map((level) => (
                    <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <FieldLabel>Primary goal</FieldLabel>
                <NativeSelect {...healthForm.register("primaryGoal")}>
                  <option value="">Select…</option>
                  {PRIMARY_GOALS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div>
              <FieldLabel>Medical conditions</FieldLabel>
              <Input className="text-base" placeholder="Comma-separated, e.g. Diabetes, Hypertension" {...healthForm.register("medicalConditions")} />
            </div>

            <div>
              <FieldLabel>Allergies</FieldLabel>
              <Input className="text-base" placeholder="Comma-separated, e.g. Penicillin, Dust" {...healthForm.register("allergies")} />
            </div>

            <div>
              <FieldLabel>Current medications</FieldLabel>
              <Input className="text-base" placeholder="e.g. Levothyroxine 50mcg daily" {...healthForm.register("currentMedications")} />
            </div>

            <div>
              <FieldLabel>Past injuries</FieldLabel>
              <Input className="text-base" placeholder="e.g. Knee ligament sprain 2023 — recovered" {...healthForm.register("pastInjuries")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Physician name</FieldLabel>
                <Input className="text-base" placeholder="Dr. Name" {...healthForm.register("physicianName")} />
              </div>
              <div>
                <FieldLabel>Physician phone</FieldLabel>
                <Input className="text-base" type="tel" placeholder="+91 98100 00000" {...healthForm.register("physicianPhone")} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={healthMutation.isPending}>
                {healthMutation.isPending ? "Saving…" : "Save health profile"}
              </Button>
              {healthSaved && <SavedBadge />}
            </div>
            {healthMutation.error && (
              <p className="text-sm text-destructive">{(healthMutation.error as Error).message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Gym membership */}
      <GymMembershipCard />

      {/* Password */}
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <FieldLabel>Current password</FieldLabel>
              <Input className="text-base" type="password" {...passwordForm.register("currentPassword")} />
              <FieldError message={passwordForm.formState.errors.currentPassword?.message} />
            </div>

            <div>
              <FieldLabel>New password</FieldLabel>
              <Input className="text-base" type="password" {...passwordForm.register("newPassword")} />
              <FieldError message={passwordForm.formState.errors.newPassword?.message} />
            </div>

            <div>
              <FieldLabel>Confirm new password</FieldLabel>
              <Input className="text-base" type="password" {...passwordForm.register("confirmPassword")} />
              <FieldError message={passwordForm.formState.errors.confirmPassword?.message} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? "Updating…" : "Update password"}
              </Button>
              {passwordSaved && <SavedBadge />}
            </div>
            {passwordMutation.error && (
              <p className="text-sm text-destructive">{(passwordMutation.error as Error).message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Gym membership card ───────────────────────────────────────────────────────

interface GymMembership {
  id: string;
  status: "PENDING" | "ACTIVE" | "ENDED";
  requestNote: string | null;
  memberNumber: string | null;
  joinedAt: string | null;
  organization: { id: string; name: string; slug: string };
  branch: { id: string; name: string } | null;
}

const joinSchema = z.object({
  slug: z.string().min(1, "Gym slug is required"),
  note: z.string().optional().or(z.literal("")),
});
type JoinForm = z.infer<typeof joinSchema>;

function GymMembershipCard(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const { data, isLoading } = useQuery<{ active: GymMembership | null; pending: GymMembership | null }>({
    queryKey: ["me-membership"],
    queryFn: () => authApi.get("/me/membership"),
    staleTime: 30_000,
    // Poll while a request is pending so approval is picked up without a manual reload
    refetchInterval: (query) => (query.state.data?.pending ? 15_000 : false),
  });

  // When the membership flips PENDING → ACTIVE, force-mint a fresh access token
  // so stale JWT claims (gymSlug) self-heal immediately instead of within 15 min
  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (data?.pending) wasPendingRef.current = true;
    if (data?.active && wasPendingRef.current) {
      wasPendingRef.current = false;
      fetch("/api/auth/token?force=1").catch(() => null);
      toast.success(`Your membership at ${data.active.organization.name} is now active!`);
    }
  }, [data]);

  const joinForm = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: { slug: "", note: "" },
  });

  const joinMutation = useMutation({
    mutationFn: (data: JoinForm) => authApi.post("/me/membership/join", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-membership"] });
      joinForm.reset();
      toast.success("Join request submitted — waiting for approval");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => authApi.post("/me/membership/cancel", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-membership"] });
      toast.success("Join request cancelled");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const transferForm = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: { slug: "", note: "" },
  });

  const transferMutation = useMutation({
    mutationFn: (form: JoinForm) => authApi.post("/me/membership/transfer", { slug: form.slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-membership"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me-programs-all"] });
      setShowTransfer(false);
      transferForm.reset();
      toast.success("Transfer requested — waiting for approval at the new gym");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => authApi.post("/me/membership/leave", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-membership"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me-programs-all"] });
      setShowLeaveConfirm(false);
      toast.success("You have left the gym. Trainer programs have been cancelled.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Gym membership</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : data?.active ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{data.active.organization.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-900/40">Active</span>
              </div>
              {data.active.branch && (
                <p className="text-xs text-muted-foreground">{data.active.branch.name}</p>
              )}
              {data.active.memberNumber && (
                <p className="text-xs text-muted-foreground">Member #{data.active.memberNumber}</p>
              )}
              {data.active.joinedAt && (
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(data.active.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
            {showTransfer && (
              <form
                onSubmit={transferForm.handleSubmit((form) => transferMutation.mutate(form))}
                className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Transferring ends your membership here and cancels trainer-assigned programs.
                    Self-created and AI programs are kept. The new gym must approve your request.
                  </p>
                </div>
                <div>
                  <FieldLabel>New gym slug</FieldLabel>
                  <Input className="text-base" placeholder="e.g. ironfit-downtown" {...transferForm.register("slug")} />
                  <FieldError message={transferForm.formState.errors.slug?.message} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={transferMutation.isPending}>
                    {transferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Transfer
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button>
                </div>
              </form>
            )}
            {!showLeaveConfirm ? (
              <div className="flex items-center gap-2">
                {!showTransfer && (
                  <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Transfer gym
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  Leave gym
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Leaving will cancel all trainer-assigned programs and remove your gym access. Self-created and AI programs are kept.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={leaveMutation.isPending}
                    onClick={() => leaveMutation.mutate()}
                  >
                    {leaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm leave"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ) : data?.pending ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-900/40 bg-yellow-900/10 px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{data.pending.organization.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/20 text-yellow-400 border border-yellow-900/40">Pending</span>
              </div>
              <p className="text-xs text-muted-foreground">Your join request is awaiting approval.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel request"}
            </Button>
          </div>
        ) : (
          <form onSubmit={joinForm.handleSubmit((data) => joinMutation.mutate(data))} className="space-y-3">
            <p className="text-sm text-muted-foreground">Not a member of any gym. Enter a gym slug to request to join.</p>
            <div>
              <FieldLabel>Gym slug</FieldLabel>
              <Input className="text-base" placeholder="e.g. ironfit-downtown" {...joinForm.register("slug")} />
              <FieldError message={joinForm.formState.errors.slug?.message} />
            </div>
            <div>
              <FieldLabel>Message (optional)</FieldLabel>
              <Input className="text-base" placeholder="Introduce yourself…" {...joinForm.register("note")} />
            </div>
            <Button type="submit" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request to join
            </Button>
            {joinMutation.error && (
              <p className="text-sm text-destructive">{(joinMutation.error as Error).message}</p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
