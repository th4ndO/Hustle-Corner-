import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSellerBySlug, getPhotoUrl } from "@/lib/sellers";
import { createClient } from "@/lib/supabase/server";
import { WHATSAPP_PREFILL_MESSAGE } from "@/config";
import ReviewForm from "@/components/ReviewForm";
import OwnReview from "@/components/OwnReview";
import ReportListingForm from "@/components/ReportListingForm";
import TrackProfileView from "@/components/TrackProfileView";
import WhatsAppButton from "@/components/WhatsAppButton";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-500">
      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
    </svg>
  );
}

function whatsappHref(whatsappNumber: string) {
  const digitsOnly = whatsappNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(WHATSAPP_PREFILL_MESSAGE)}`;
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);
  if (!seller) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === seller.ownerId;
  let ownReview: { id: string; rating: number; comment: string | null } | null = null;
  if (user && !isOwner) {
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment")
      .eq("seller_id", seller.id)
      .eq("author_id", user.id)
      .maybeSingle();
    ownReview = data;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <TrackProfileView sellerId={seller.id} />
      {seller.photos.length > 0 ? (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {seller.photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={getPhotoUrl(photo.storagePath)}
                alt={`${seller.businessName} portfolio photo`}
                fill
                className="object-cover"
                sizes="33vw"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-gray-100 text-5xl font-semibold text-gray-300">
          {seller.businessName.charAt(0)}
        </div>
      )}

      <div className="mb-1 flex flex-wrap gap-1">
        {seller.categories.map((c) => (
          <span
            key={c.slug}
            className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
          >
            {c.name}
          </span>
        ))}
      </div>

      <h1 className="text-2xl font-bold">{seller.businessName}</h1>

      <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
        <StarIcon />
        <span>
          {seller.reviewCount > 0
            ? `${seller.avgRating.toFixed(1)} (${seller.reviewCount} review${seller.reviewCount === 1 ? "" : "s"})`
            : "No reviews yet"}
        </span>
        {seller.areaNote && <span className="text-gray-400">· {seller.areaNote}</span>}
      </div>

      {seller.bio && <p className="mt-4 text-gray-700">{seller.bio}</p>}

      <WhatsAppButton sellerId={seller.id} href={whatsappHref(seller.whatsappNumber)} />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Services</h2>
        {seller.services.length > 0 ? (
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200">
            {seller.services.map((service) => (
              <li key={service.id} className="flex items-center justify-between px-4 py-3">
                <span>{service.name}</span>
                <span className="font-medium">
                  {service.priceTo && service.priceTo !== service.priceFrom
                    ? `R${service.priceFrom}–R${service.priceTo}`
                    : `from R${service.priceFrom}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No services listed yet.</p>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Reviews</h2>

        {ownReview ? (
          <OwnReview
            reviewId={ownReview.id}
            slug={slug}
            rating={ownReview.rating}
            comment={ownReview.comment}
          />
        ) : user && !isOwner ? (
          <ReviewForm sellerId={seller.id} slug={slug} />
        ) : !user ? (
          <p className="text-sm text-gray-500">
            <Link href="/login" className="font-medium text-brand-600">
              Log in
            </Link>{" "}
            to leave a review.
          </p>
        ) : null}

        {seller.reviews.filter((r) => r.id !== ownReview?.id).length > 0 ? (
          <ul className="space-y-4">
            {seller.reviews
              .filter((r) => r.id !== ownReview?.id)
              .map((review) => (
                <li key={review.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <StarIcon />
                    <span>{review.rating}/5</span>
                    <span className="text-gray-400">· {review.authorName}</span>
                  </div>
                  {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}
                </li>
              ))}
          </ul>
        ) : !ownReview ? (
          <p className="text-gray-500">No reviews yet — be the first to leave one.</p>
        ) : null}
      </section>

      {user && !isOwner && <ReportListingForm sellerId={seller.id} />}
    </main>
  );
}
