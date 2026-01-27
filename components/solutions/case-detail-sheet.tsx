"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Target, Sparkles, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CaseThumbnail } from "./case-thumbnail";

interface CaseData {
  id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
}

interface CaseDetailSheetProps {
  case_: CaseData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionId: string;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.4,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  }),
};

function CaseSection({
  icon: Icon,
  title,
  content,
  index,
  accentColor,
}: {
  icon: typeof Target;
  title: string;
  content: string;
  index: number;
  accentColor: string;
}) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 rounded-xl p-2.5 ${accentColor} transition-transform group-hover:scale-110`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {title}
          </h3>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function CaseDetailSheet({
  case_,
  open,
  onOpenChange,
  solutionId,
}: CaseDetailSheetProps) {
  if (!case_) return null;

  const sections = [
    {
      icon: FileText,
      title: "Summary",
      content: case_.summary,
      accentColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      icon: Target,
      title: "The Challenge",
      content: case_.problem,
      accentColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      icon: Lightbulb,
      title: "Our Approach",
      content: case_.solution,
      accentColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      icon: Sparkles,
      title: "The Results",
      content: case_.result,
      accentColor: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
  ].filter((s) => s.content);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[50vw] sm:max-w-none p-0 overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{case_.title} - Case Study</SheetTitle>
          <SheetDescription>
            Details about the {case_.title} case study
          </SheetDescription>
        </SheetHeader>

        {/* Hero Image */}
        <div className="relative h-56 sm:h-72 w-full bg-muted overflow-hidden">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="absolute inset-0"
          >
            <CaseThumbnail
              src={`/api/solutions/${solutionId}/cases/${case_.id}/thumbnail?redirect=1`}
              alt={case_.title}
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-3">
                Case Study
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {case_.title}
              </h2>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 space-y-8">
            {sections.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No details available for this case study.
              </p>
            ) : (
              sections.map((section, index) => (
                <div key={section.title}>
                  <CaseSection
                    icon={section.icon}
                    title={section.title}
                    content={section.content!}
                    index={index}
                    accentColor={section.accentColor}
                  />
                  {index < sections.length - 1 && (
                    <Separator className="mt-8" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
