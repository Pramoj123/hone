"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  gymSlug: string | null;
}

export default function AdminLoginPage(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData): Promise<AuthResponse> => {
      const res = await api.post<AuthResponse>("/auth/login", data);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: res.access_token, refresh_token: res.refresh_token }),
      });
      return res;
    },
    onSuccess: (res: AuthResponse): void => {
      const payload = JSON.parse(atob(res.access_token.split(".")[1])) as JwtPayload;
      // Only follow same-site relative paths — never absolute/protocol-relative URLs
      const rawNext = params.get("next");
      const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
      const next =
        safeNext ??
        (payload.role === "SUPER_ADMIN" ? "/dashboard" : `/${payload.gymSlug}/dashboard`);
      router.replace(next);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            hone<span className="text-[#ccff00] drop-shadow-sm">.</span>
          </span>
          <p className="mt-1 text-sm text-muted-foreground">Staff portal</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-6">Sign in to your workspace</h2>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@gymname.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mutation.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {mutation.error.message}
                </p>
              )}

              <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
                {mutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Member?{" "}
          <a href={process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"} className="underline hover:text-foreground">
            Use the member portal
          </a>
        </p>
      </div>
    </div>
  );
}
