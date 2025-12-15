import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function OffersLoading() {
  return (
    <div className="container py-10 mx-auto">
      <div className="flex flex-col gap-4 mb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-full flex flex-col overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start gap-2 mb-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-7 w-full mb-1" />
              <Skeleton className="h-7 w-2/3" />
            </CardHeader>
            <CardContent className="p-4 pt-2 grow">
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-10" />
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 mt-auto border-t bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-2 mt-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="text-right mt-3">
                <Skeleton className="h-3 w-12 ml-auto mb-1" />
                <Skeleton className="h-6 w-16 ml-auto" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
