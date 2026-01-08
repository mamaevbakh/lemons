import { Spinner } from "@/components/ui/spinner";

export default function OrderSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center gap-3">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">
          Thanks! Your payment was successful. We’re creating your order now.
        </p>
      </div>
    </div>
  );
}
