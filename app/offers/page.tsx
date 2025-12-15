import { createClient } from "@/lib/supabase/server";
import { OfferCard, type OfferWithRelations } from "@/components/offer-card";

export const metadata = {
  title: "Explore Offers | Lemons",
  description: "Discover high-quality digital services packaged as products.",
};

export default async function OffersPage() {
  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select(`
      *,
      categories (
        name
      ),
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq("offer_status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="container py-10 mx-auto">
      <div className="flex flex-col gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Explore Offers</h1>
        <p className="text-muted-foreground">
          Discover high-quality digital services packaged as products.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {offers?.map((offer) => (
          <OfferCard key={offer.id} offer={offer as unknown as OfferWithRelations} />
        ))}
      </div>

      {(!offers || offers.length === 0) && (
        <div className="text-center py-20">
          <h3 className="text-lg font-medium">No offers found</h3>
          <p className="text-muted-foreground mt-2">
            Check back later for new services.
          </p>
        </div>
      )}
    </div>
  );
}
