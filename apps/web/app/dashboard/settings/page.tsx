"use client";

import { useState } from "react";
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
import { Check } from "lucide-react";

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
