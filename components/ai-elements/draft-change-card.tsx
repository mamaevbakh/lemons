"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";

type DraftPatch = {
  type: "draftPatch";
  offerPatch?: {
    title?: string;
    description?: string;
    categoryId?: string;
    tags?: string[];
    status?: "draft" | "active";
    currencyCode?: string;
  };
  packagesPatch?: Array<{
    index: number;
    id?: string;
    name?: string;
    description?: string;
    priceCents?: number;
    deliveryDays?: number;
    revisions?: number;
    _deleted?: boolean;
  }>;
};

export type DraftChangeCardProps = ComponentProps<"div"> & {
  patch: DraftPatch;
};

export function DraftChangeCard({
  patch,
  className,
  ...props
}: DraftChangeCardProps) {
  const offerChanges = getOfferChanges(patch.offerPatch);
  const packageChanges = getPackageChanges(patch.packagesPatch);

  const hasChanges = offerChanges.length > 0 || packageChanges.length > 0;

  if (!hasChanges) {
    return null;
  }

  // Build a concise summary
  const summary = buildSummary(offerChanges, packageChanges);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border-emerald-100 border bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        className
      )}
      {...props}
    >
      <CheckIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
      <span>{summary}</span>
    </div>
  );
}

function buildSummary(offerChanges: string[], packageChanges: string[]): string {
  const parts: string[] = [];

  if (offerChanges.length > 0) {
    if (offerChanges.length <= 2) {
      parts.push(`Updated ${offerChanges.join(" & ")}`);
    } else {
      parts.push(`Updated ${offerChanges.length} offer fields`);
    }
  }

  if (packageChanges.length > 0) {
    if (packageChanges.length === 1) {
      parts.push(packageChanges[0]);
    } else {
      parts.push(`${packageChanges.length} packages modified`);
    }
  }

  return parts.join(" · ");
}

function getOfferChanges(offerPatch: DraftPatch["offerPatch"]): string[] {
  if (!offerPatch) return [];

  const changes: string[] = [];

  if (offerPatch.title !== undefined) changes.push("title");
  if (offerPatch.description !== undefined) changes.push("description");
  if (offerPatch.categoryId !== undefined) changes.push("category");
  if (offerPatch.tags !== undefined) changes.push("tags");
  if (offerPatch.status !== undefined) changes.push("status");
  if (offerPatch.currencyCode !== undefined) changes.push("currency");

  return changes;
}

function getPackageChanges(
  packagesPatch: DraftPatch["packagesPatch"]
): string[] {
  if (!packagesPatch || packagesPatch.length === 0) return [];

  const changes: string[] = [];

  packagesPatch.forEach((pkg) => {
    if (pkg._deleted) {
      changes.push(`Removed package #${pkg.index + 1}`);
      return;
    }

    const pkgName = pkg.name ?? `Package #${pkg.index + 1}`;
    const fields: string[] = [];

    if (pkg.name !== undefined) fields.push("name");
    if (pkg.description !== undefined) fields.push("description");
    if (pkg.priceCents !== undefined) fields.push("price");
    if (pkg.deliveryDays !== undefined) fields.push("delivery");
    if (pkg.revisions !== undefined) fields.push("revisions");

    if (fields.length > 0) {
      changes.push(`Updated ${pkgName}`);
    }
  });

  return changes;
}
