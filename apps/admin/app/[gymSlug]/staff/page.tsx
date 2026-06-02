"use client";

import { use, useState, useRef, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
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
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "BRANCH_MANAGER" | "TRAINER";
  branchId: string | null;
  phone: string | null;
  employeeId: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  hireDate: string | null;
  createdAt: string;
}

const staffSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["BRANCH_MANAGER", "TRAINER"]),
  branchId: z.string().min(1, "Required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  employeeId: z.string().optional(),
  hireDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function StaffPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff", gymSlug, roleFilter],
    queryFn: () => {
      const qs = roleFilter !== "ALL" ? `?role=${roleFilter}` : "";
      return authApi.get<StaffMember[]>(`/gyms/${gymSlug}/staff${qs}`);
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches", gymSlug],
    queryFn: () => authApi.get<Branch[]>(`/gyms/${gymSlug}/branches`),
  });

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "", email: "", password: "",
      role: "TRAINER", branchId: "",
      phone: "", dateOfBirth: "", gender: "", employeeId: "",
      hireDate: "", emergencyContactName: "", emergencyContactPhone: "",
      bio: "", specializations: [], certifications: [],
    },
  });

  const watchedRole = form.watch("role");

  const mutation = useMutation({
    mutationFn: (data: StaffFormData) =>
      authApi.post(`/gyms/${gymSlug}/staff`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", gymSlug] });
      queryClient.invalidateQueries({ queryKey: ["stats", gymSlug] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <Badge variant={row.role === "BRANCH_MANAGER" ? "default" : "secondary"}>
          {row.role === "BRANCH_MANAGER" ? "Manager" : "Trainer"}
        </Badge>
      ),
    },
    {
      key: "specializations",
      header: "Specializations",
      cell: (row) =>
        row.specializations.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.specializations.slice(0, 2).map((spec) => (
              <Badge key={spec} variant="outline" className="text-xs">{spec}</Badge>
            ))}
            {row.specializations.length > 2 && (
              <Badge variant="outline" className="text-xs">+{row.specializations.length - 2}</Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      cell: (row) => (
        <span className="text-sm font-mono text-muted-foreground">
          {row.employeeId ?? "—"}
        </span>
      ),
    },
    {
      key: "hireDate",
      header: "Hired",
      cell: (row) =>
        row.hireDate
          ? new Date(row.hireDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          : "—",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {staff?.length ?? 0} staff member{staff?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add staff
        </Button>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["ALL", "TRAINER", "BRANCH_MANAGER"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === role
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {role === "ALL" ? "All" : role === "TRAINER" ? "Trainers" : "Managers"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={staff ?? []}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No staff members found."
        mobileCard={(row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
              {row.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{row.name}</p>
              <p className="text-xs text-muted-foreground truncate">{row.email}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {row.role === "BRANCH_MANAGER" ? "Manager" : "Trainer"}
              </span>
              {row.employeeId && (
                <span className="text-xs font-mono text-muted-foreground">{row.employeeId}</span>
              )}
            </div>
          </div>
        )}
      />

      {/* Add Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) form.reset();
      }}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

                <Section title="Account">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name <Req /></FormLabel>
                        <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <Req /></FormLabel>
                        <FormControl><Input type="email" placeholder="jane@gym.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temp password <Req /></FormLabel>
                        <FormControl><Input type="password" placeholder="Min 8 chars" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>

                <Section title="Role & Assignment">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role <Req /></FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="TRAINER">Trainer</option>
                            <option value="BRANCH_MANAGER">Branch Manager</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="branchId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch <Req /></FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select branch…</option>
                            {branches?.map((branch) => (
                              <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>

                {watchedRole === "TRAINER" && (
                  <Section title="Trainer Details">
                    <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <textarea
                            rows={3}
                            placeholder="Brief professional background…"
                            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="specializations" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specializations</FormLabel>
                        <TagInput
                          values={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Type and press Enter…"
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="certifications" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifications</FormLabel>
                        <TagInput
                          values={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="e.g. NASM-CPT, ACE…"
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                  </Section>
                )}

                <Section title="Personal (optional)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          >
                            <option value="">Select…</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="employeeId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl><Input placeholder="EMP-005" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hireDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency contact name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency contact phone</FormLabel>
                        <FormControl><Input placeholder="+91 99999 00000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Section>
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
                    {mutation.isPending ? "Adding…" : "Add staff member"}
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

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value && !values.includes(value)) {
      onChange([...values, value]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((tagValue) => (
            <span
              key={tagValue}
              className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md"
            >
              {tagValue}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== tagValue))}
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

function Req(): React.JSX.Element {
  return <span className="text-destructive ml-0.5">*</span>;
}
