"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import type { VariantProps } from "class-variance-authority";

type GatedCreateButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Server-fetched: can this user create another? */
    canCreate: boolean;
    /** What kind of entity is being created */
    entityType: "solution" | "offer";
    /** The server action to call when allowed */
    createAction: () => Promise<void>;
    /** Button label */
    children: React.ReactNode;
  };

export function GatedCreateButton({
  canCreate,
  entityType,
  createAction,
  children,
  ...buttonProps
}: GatedCreateButtonProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!canCreate) {
      setShowUpgrade(true);
      return;
    }

    startTransition(async () => {
      await createAction();
    });
  }

  return (
    <>
      <Button type="button" onClick={handleClick} disabled={isPending} {...buttonProps}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {children}
      </Button>
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        context={entityType}
      />
    </>
  );
}
