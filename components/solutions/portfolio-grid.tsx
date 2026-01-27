"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CaseThumbnail } from "./case-thumbnail";
import { CaseDetailSheet } from "./case-detail-sheet";

interface CaseData {
  id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
}

interface PortfolioGridProps {
  cases: CaseData[];
  solutionId: string;
}

export function PortfolioGrid({ cases, solutionId }: PortfolioGridProps) {
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCaseClick = (caseItem: CaseData) => {
    setSelectedCase(caseItem);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {cases.map((c) => (
          <Card
            key={c.id}
            onClick={() => handleCaseClick(c)}
            className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
          >
            <div className="relative aspect-video w-full bg-muted overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                <CaseThumbnail
                  src={`/api/solutions/${solutionId}/cases/${c.id}/thumbnail?redirect=1`}
                  alt={c.title}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-3 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-sm font-medium text-white">
                  View case study →
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                {c.title}
              </div>
              <p className="mt-2 text-muted-foreground line-clamp-2">
                {c.summary ?? c.result ?? c.problem ?? ""}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <CaseDetailSheet
        case_={selectedCase}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        solutionId={solutionId}
      />
    </>
  );
}
