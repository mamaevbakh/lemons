"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";

type DraftPatch = {
  type: "draftPatch";
  solutionPatch?: {
    title?: string;
    headline?: string;
    description?: string;
    websiteUrl?: string;
    slug?: string;
    status?: "draft" | "published" | "archived";
  };
};

export type SolutionDraftChangeCardProps = ComponentProps<"div"> & {
  patch: DraftPatch;
};

export function SolutionDraftChangeCard({
  patch,
  className,
  ...props
}: SolutionDraftChangeCardProps) {
  const changes = getSolutionChanges(patch.solutionPatch);

  if (changes.length === 0) {
    return null;
  }

  const summary =
    changes.length <= 2
      ? `Updated ${changes.join(" & ")}`
      : `Updated ${changes.length} solution fields`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border-emerald-100 border bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        className,
      )}
      {...props}
    >
      <CheckIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
      <span>{summary}</span>
    </div>
  );
}

function getSolutionChanges(patch: DraftPatch["solutionPatch"]): string[] {
  if (!patch) return [];

  const changes: string[] = [];

  if (patch.title !== undefined) changes.push("title");
  if (patch.headline !== undefined) changes.push("headline");
  if (patch.description !== undefined) changes.push("about");
  if (patch.websiteUrl !== undefined) changes.push("website");
  if (patch.slug !== undefined) changes.push("slug");
  if (patch.status !== undefined) changes.push("status");

  return changes;
}
