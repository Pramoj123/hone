import Link from "next/link";
import {
  Dumbbell,
  Users,
  ClipboardList,
  LineChart,
  Building2,
  ShieldCheck,
  Smartphone,
  CalendarCheck,
  ArrowRight,
  Check,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Workout programming",
    description:
      "Build a workout library with sets, reps, rest, media, and difficulty. Assign one-off sessions or multi-week program plans in a drag-and-drop weekly grid.",
  },
  {
    icon: ClipboardList,
    title: "Custom assessments",
    description:
      "Create check-in templates with the exact fields your coaches need — weight, measurements, RPE, free text — and schedule them weekly without lifting a finger.",
  },
  {
    icon: LineChart,
    title: "Progress analytics",
    description:
      "Volume charts, PR boards, activity heatmaps and streaks for every member. Trainers see exactly what happened between sessions.",
  },
  {
    icon: Building2,
    title: "Multi-branch ready",
    description:
      "One organization, many locations. Branch managers see their branch; owners see everything. Members keep one profile across all of them.",
  },
  {
    icon: Users,
    title: "Roles that match your gym",
    description:
      "Owner, branch manager, trainer, and member roles out of the box — each with their own portal, permissions, and views. No spreadsheet juggling.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description:
      "Token-based auth with rotation and revocation, invite-only staff onboarding, email verification, and per-gym data isolation on every request.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your gym",
    description: "Get your own branded space at hone.fit/your-gym with branches, staff, and members.",
  },
  {
    n: "02",
    title: "Invite your team",
    description: "Email invites for managers, trainers, and members — everyone lands in the right portal.",
  },
  {
    n: "03",
    title: "Program and assign",
    description: "Build workouts once, assign them as sessions or multi-week plans to any client.",
  },
  {
    n: "04",
    title: "Track everything",
    description: "Members log sets from their phone; trainers review progress and weekly check-ins live.",
  },
];

export default function MarketingPage(): React.JSX.Element {
  return (
    <main>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-2xl font-bold tracking-tight">
            hone<span className="text-brand">.</span>
          </span>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#portals" className="transition-colors hover:text-foreground">
              Portals
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href={`${APP_URL}/login`}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href={`${APP_URL}/register`}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 70% 10%, rgba(204,255,0,0.10), transparent 70%), radial-gradient(500px 260px at 20% 90%, rgba(204,255,0,0.05), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pt-28">
          <p className="mx-auto mb-6 w-fit rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Built for gyms, studios, and personal trainers
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            The operating system for <span className="text-brand">modern gyms</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            One platform for members, trainers, workout programming, assessments, and progress
            tracking — across every branch you run.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`${APP_URL}/register`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`${ADMIN_URL}/login`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:border-muted-foreground"
            >
              Staff portal
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {[
              ["Multi-branch", "1 platform"],
              ["Member + staff", "2 portals"],
              ["Setup time", "< 10 min"],
              ["Spreadsheets", "0 needed"],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-6 py-5">
                <p className="text-xl font-bold text-brand">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Everything your floor team needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            From the front desk to the squat rack — Hone keeps owners, trainers, and members on
            the same page.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-muted-foreground/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Up and running before your next class
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {STEPS.map(({ n, title, description }) => (
              <div key={n} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="text-sm font-bold text-brand">{n}</span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Two portals. One source of truth.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-4 flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-semibold">Member portal</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A focused, mobile-first training companion. Members see today&apos;s session, log
                sets as they lift, complete weekly check-ins, and watch their volume, PRs, and
                streaks grow.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Live session logging with per-set tracking",
                  "Assigned programs and multi-week plans",
                  "Progress charts, PR board, activity heatmap",
                  "Health profile and weekly assessments",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-4 flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-semibold">Staff portal</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A desktop-first command center for owners, managers, and trainers. Manage branches,
                staff, and members; build workout libraries; assign programs; review check-ins.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Branch, staff, and member management",
                  "Workout library with review workflow",
                  "Drag-and-drop weekly program builder",
                  "Client progress and assessment review",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(500px 240px at 50% 0%, rgba(204,255,0,0.12), transparent 70%)",
              }}
            />
            <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">
              Ready to run a sharper gym?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Set up your gym, invite your team, and assign your first program — all in one
              afternoon.
            </p>
            <div className="relative mt-8">
              <Link
                href={`${APP_URL}/register`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-8 py-3 font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
          <span className="text-lg font-bold tracking-tight text-foreground">
            hone<span className="text-brand">.</span>
          </span>
          <p>© {new Date().getFullYear()} Hone. Track your training. Own your progress.</p>
          <div className="flex gap-6">
            <Link href={`${APP_URL}/login`} className="transition-colors hover:text-foreground">
              Member sign in
            </Link>
            <Link href={`${ADMIN_URL}/login`} className="transition-colors hover:text-foreground">
              Staff sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
