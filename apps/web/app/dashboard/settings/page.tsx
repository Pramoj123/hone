"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface Me {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const { data: me, isLoading } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => authApi.get<Me>("/auth/me"),
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: me ? { name: me.name, phone: me.phone ?? "" } : undefined,
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => authApi.patch("/auth/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.patch("/auth/me/password", { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-lg space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Display name</label>
              <Input {...profileForm.register("name")} />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
              <Input value={me?.email ?? ""} disabled className="opacity-50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Contact your trainer to update your email.</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Phone number</label>
              <Input type="tel" placeholder="+91 98100 00000" {...profileForm.register("phone")} />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
              {profileSaved && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>

            {profileMutation.error && (
              <p className="text-sm text-destructive">{(profileMutation.error as Error).message}</p>
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
              <label className="text-xs text-muted-foreground block mb-1.5">Current password</label>
              <Input type="password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">New password</label>
              <Input type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Confirm new password</label>
              <Input type="password" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? "Updating…" : "Update password"}
              </Button>
              {passwordSaved && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <Check className="h-4 w-4" /> Updated
                </span>
              )}
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
