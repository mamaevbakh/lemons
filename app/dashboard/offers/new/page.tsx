import { Button } from "@/components/ui/button";
import { createOfferAction } from "../create-actions";

export default function NewOfferPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create offer</h1>
      <p className="text-sm text-muted-foreground">
        This will create a draft offer and take you to the editor.
      </p>

      <form action={createOfferAction}>
        <Button type="submit">Create draft offer</Button>
      </form>
    </div>
  );
}
