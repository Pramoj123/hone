"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const TIMEZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Australia/Sydney",
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const createGymSchema = z.object({
  // Basics
  name: z.string().min(1, "Required"),
  slug: z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().optional(),
  // Location
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  // Contact
  phone: z.string().optional(),
  publicEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  // Operational
  timezone: z.string().optional(),
  currency: z.string().optional(),
  openingHours: z.string().optional(),
  // Branding
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour").optional().or(z.literal("")),
  // Org admin
  orgAdminName: z.string().min(1, "Required"),
  orgAdminEmail: z.string().email("Invalid email"),
  orgAdminPassword: z.string().min(8, "Min 8 characters"),
});

type CreateGymFormData = z.infer<typeof createGymSchema>;

interface CreateGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGymDialog({ open, onOpenChange }: CreateGymDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<CreateGymFormData>({
    resolver: zodResolver(createGymSchema),
    defaultValues: {
      name: "", slug: "", description: "",
      address: "", city: "", state: "", country: "", postalCode: "",
      phone: "", publicEmail: "", website: "",
      timezone: "UTC", currency: "USD", openingHours: "",
      logoUrl: "", primaryColor: "#111827",
      orgAdminName: "", orgAdminEmail: "", orgAdminPassword: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setLogoPreview(null);
    }
  }, [open, form]);

  async function handleLogoFile(file: File): Promise<void> {
    setLogoUploading(true);
    try {
      const res = await authApi.post<{ uploadUrl: string; fileUrl: string }>("/uploads/presign", {
        filename: file.name,
        contentType: file.type,
      });
      await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      form.setValue("logoUrl", res.fileUrl);
      setLogoPreview(res.fileUrl);
    } catch {
      form.setError("logoUrl", { message: "Upload failed — check your AWS configuration" });
    } finally {
      setLogoUploading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: (data: CreateGymFormData): Promise<unknown> => authApi.post("/gyms", data),
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ["gyms"] });
      onOpenChange(false);
    },
  });

  function handleNameChange(value: string): void {
    form.setValue("name", value);
    form.setValue("slug", value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
          <DialogTitle>Create a gym</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">

              {/* ── Basics ── */}
              <Section title="Basics">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gym name <Required /></FormLabel>
                      <FormControl>
                        <Input placeholder="Iron Paradise" {...field} onChange={(e) => handleNameChange(e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL slug <Required /></FormLabel>
                      <FormControl><Input placeholder="iron-paradise" {...field} /></FormControl>
                      <FormDescription>hone.fit/your-slug</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        rows={2}
                        placeholder="A short description of the gym…"
                        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </Section>

              {/* ── Location ── */}
              <Section title="Location">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street address</FormLabel>
                    <FormControl><Input placeholder="123 Main Street" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input placeholder="India" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="postalCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl><Input placeholder="400001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </Section>

              {/* ── Contact ── */}
              <Section title="Contact">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="publicEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public email</FormLabel>
                      <FormControl><Input type="email" placeholder="hello@ironparadise.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input placeholder="https://ironparadise.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </Section>

              {/* ── Operational ── */}
              <Section title="Operational">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          {...field}
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          {...field}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="openingHours" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening hours</FormLabel>
                    <FormControl>
                      <Input placeholder="Mon–Fri: 6am–10pm, Sat–Sun: 8am–8pm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </Section>

              {/* ── Branding ── */}
              <Section title="Branding">
                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                            Logo
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoFile(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={logoUploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {logoUploading ? "Uploading…" : "Upload image"}
                          </Button>
                          <Input
                            placeholder="or paste a URL"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setLogoPreview(e.target.value || null);
                            }}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand colour</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={field.value ?? "#111827"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10 w-14 rounded-md border border-border cursor-pointer p-1 bg-input"
                        />
                        <Input
                          placeholder="#111827"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </Section>

              {/* ── Org admin ── */}
              <Section title="Org admin account">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="orgAdminName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <Required /></FormLabel>
                      <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="orgAdminEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <Required /></FormLabel>
                      <FormControl><Input type="email" placeholder="jane@ironparadise.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="orgAdminPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password <Required /></FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </Section>

            </div>

            <div className="px-8 py-5 border-t border-border shrink-0">
              {mutation.error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
                  {mutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                  {mutation.isPending ? "Creating…" : "Create gym"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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

function Required(): React.JSX.Element {
  return <span className="text-destructive ml-0.5">*</span>;
}
