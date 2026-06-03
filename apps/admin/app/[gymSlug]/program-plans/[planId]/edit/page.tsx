"use client";

import { use } from "react";
import { ProgramBuilder } from "@/components/program-builder/program-builder";

interface PageProps {
  params: Promise<{ gymSlug: string; planId: string }>;
}

export default function EditProgramPlanPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug, planId } = use(params);
  return <ProgramBuilder gymSlug={gymSlug} existingPlanId={planId} />;
}
