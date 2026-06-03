"use client";

import { use } from "react";
import { ProgramBuilder } from "@/components/program-builder/program-builder";

interface PageProps {
  params: Promise<{ gymSlug: string }>;
}

export default function NewProgramPlanPage({ params }: PageProps): React.JSX.Element {
  const { gymSlug } = use(params);
  return <ProgramBuilder gymSlug={gymSlug} />;
}
