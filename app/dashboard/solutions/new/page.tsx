import { Button } from "@/components/ui/button";
import { createSolutionAction } from "../create-actions";

export default function NewSolutionPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create solution</h1>
      <p className="text-sm text-muted-foreground">
        This will create a draft solution and take you to the editor.
      </p>

      <form action={createSolutionAction}>
        <Button type="submit">Create draft solution</Button>
      </form>
    </div>
  );
}
