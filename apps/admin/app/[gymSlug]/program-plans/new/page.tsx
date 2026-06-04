"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ProgramBuilder } from "@/components/program-builder/program-builder";

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function NewProgramPlanPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get("clientId") ?? undefined;
  return <ProgramBuilder gymSlug={gymSlug} defaultClientId={defaultClientId} />;
}
