"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  memberNumber: string | null;
  branchId: string | null;
  gender: string | null;
  fitnessGoals: string | null;
  createdAt: string;
  memberProfile: {
    hasSignedWaiver: boolean;
    fitnessLevel: string | null;
    primaryGoal: string | null;
  } | null;
}

const memberSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  branchId: z.string().min(1, "Required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  memberNumber: z.string().optional(),
  fitnessGoals: z.string().optional(),
  referredBy: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  healthNotes: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function MembersPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["members", gymSlug],
    queryFn: () => authApi.get<Member[]>(`/gyms/${gymSlug}/members`),
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches", gymSlug],
    queryFn: () => authApi.get<Branch[]>(`/gyms/${gymSlug}/branches`),
  });

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "", email: "", password: "", branchId: "",
      phone: "", dateOfBirth: "", gender: "", memberNumber: "",
      fitnessGoals: "", referredBy: "", emergencyContactName: "",
      emergencyContactPhone: "", healthNotes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: MemberFormData) =>
      authApi.post(`/gyms/${gymSlug}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", gymSlug] });
      queryClient.invalidateQueries({ queryKey: ["stats", gymSlug] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Member",
      cell: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "memberNumber",
      header: "ID",
      cell: (row) =>
        row.memberNumber ? (
          <Badge variant="outline" className="font-mono text-xs">{row.memberNumber}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "waiver",
      header: "Waiver",
      cell: (row) =>
        row.memberProfile?.hasSignedWaiver ? (
          <Badge variant="secondary" className="text-xs text-green-700 bg-green-100">Signed</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-orange-600">Pending</Badge>
        ),
    },
    {
      key: "fitnessLevel",
      header: "Level",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.memberProfile?.fitnessLevel ?? "—"}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      cell: (row) =>
        new Date(row.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add member
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={members ?? []}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No members yet."
        onRowClick={(row) => router.push(`/${gymSlug}/members/${row.id}`)}
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
              {row.memberNumber && (
                <span className="text-xs font-mono border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                  {row.memberNumber}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        )}
      />

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) form.reset();
      }}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-border shrink-0">
            <DialogTitle>Add member</DialogTitle>
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
                        <FormControl><Input placeholder="Kiran Desai" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <Req /></FormLabel>
                        <FormControl><Input type="email" placeholder="kiran@example.com" {...field} /></FormControl>
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

                <Section title="Personal">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="+91 99887 11111" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="memberNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member number</FormLabel>
                        <FormControl><Input placeholder="HNM-0001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
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
                  <FormField control={form.control} name="referredBy" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred by</FormLabel>
                      <FormControl><Input placeholder="Name or member ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fitnessGoals" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fitness goals</FormLabel>
                      <FormControl>
                        <textarea
                          rows={2}
                          placeholder="Build muscle, improve stamina…"
                          className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="healthNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff health notes</FormLabel>
                      <FormControl>
                        <textarea
                          rows={2}
                          placeholder="Internal notes for staff (not visible to member)…"
                          className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                    {mutation.isPending ? "Adding…" : "Add member"}
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
