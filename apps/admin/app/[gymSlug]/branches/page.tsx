"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, Phone, Mail, Clock, Users } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  timezone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  capacity: number | null;
  createdAt: string;
}

const TIMEZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles",
  "Australia/Sydney",
];

const branchSchema = z.object({
  name: z.string().min(1, "Required"),
  timezone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  openingHours: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional().or(z.literal("")),
  description: z.string().optional(),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function BranchesPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["branches", gymSlug],
    queryFn: () => authApi.get<Branch[]>(`/gyms/${gymSlug}/branches`),
  });

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "", timezone: "UTC",
      address: "", city: "", state: "", country: "", postalCode: "",
      phone: "", email: "", openingHours: "", description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: BranchFormData) =>
      authApi.post(`/gyms/${gymSlug}/branches`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", gymSlug] });
      queryClient.invalidateQueries({ queryKey: ["stats", gymSlug] });
      setDialogOpen(false);
      form.reset();
    },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {branches?.length ?? 0} location{branches?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add branch
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (branches?.length ?? 0) === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
          No branches yet. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches!.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) form.reset();
      }}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
            <DialogTitle>Add branch</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="Andheri West" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

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

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="branch@gym.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="12 Main Street" {...field} /></FormControl>
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
                      <FormLabel>State</FormLabel>
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
                      <FormControl><Input placeholder="400053" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="openingHours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening hours</FormLabel>
                      <FormControl><Input placeholder="Mon–Sat: 6am–10pm" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl><Input type="number" placeholder="150" {...field} /></FormControl>
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
                        placeholder="Brief description of this location…"
                        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="px-8 py-5 border-t border-border shrink-0">
                {mutation.error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
                    {(mutation.error as Error).message}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                    {mutation.isPending ? "Creating…" : "Create branch"}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BranchCard({ branch }: { branch: Branch }): React.JSX.Element {
  const location = [branch.city, branch.state].filter(Boolean).join(", ");

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{branch.name}</h3>
            {branch.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{branch.timezone}</p>
        </div>
        {branch.capacity && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3.5 w-3.5" />
            {branch.capacity}
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{location}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>{branch.email}</span>
          </div>
        )}
        {branch.openingHours && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{branch.openingHours}</span>
          </div>
        )}
      </div>
    </div>
  );
}
