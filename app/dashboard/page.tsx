import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSellerByOwner, getPhotoUrl } from "@/lib/sellers";
import { getSellerStats } from "@/lib/stats";
import { LIMITS } from "@/config";
import EditBasicInfoForm from "@/components/EditBasicInfoForm";
import AddServiceForm from "@/components/AddServiceForm";
import DeleteServiceButton from "@/components/DeleteServiceButton";
import DeletePhotoButton from "@/components/DeletePhotoButton";
import DashboardPhotoUploader from "@/components/DashboardPhotoUploader";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Live",
  hidden: "Hidden by admin",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const seller = await getSellerByOwner(user.id);
  const stats = seller ? await getSellerStats(seller.id) : null;

  if (!seller) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">List your services</h1>
        <p className="mt-2 text-gray-600">
          You don&apos;t have a seller profile yet. It takes about 5 minutes to set up.
        </p>
        <Link
          href="/dashboard/become-seller"
          className="mt-6 inline-block rounded-full bg-brand-600 px-6 py-3 font-semibold text-white"
        >
          Become a seller
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-8 pb-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{seller.businessName}</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            seller.status === "approved"
              ? "bg-green-100 text-green-700"
              : seller.status === "hidden"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {STATUS_LABEL[seller.status] ?? seller.status}
        </span>
      </div>

      {stats && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Profile views</p>
              <p className="text-lg font-semibold">
                {stats.views7d} <span className="text-sm font-normal text-gray-400">/ 7d</span>
              </p>
              <p className="text-sm text-gray-500">{stats.views30d} in last 30d</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">WhatsApp clicks</p>
              <p className="text-lg font-semibold">
                {stats.clicks7d} <span className="text-sm font-normal text-gray-400">/ 7d</span>
              </p>
              <p className="text-sm text-gray-500">{stats.clicks30d} in last 30d</p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Profile
        </h2>
        <EditBasicInfoForm seller={seller} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Services
        </h2>
        <ul className="mb-3 space-y-2">
          {seller.services.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-gray-500">
                  {s.priceTo && s.priceTo !== s.priceFrom
                    ? `R${s.priceFrom}–R${s.priceTo}`
                    : `from R${s.priceFrom}`}
                </p>
              </div>
              <DeleteServiceButton serviceId={s.id} />
            </li>
          ))}
        </ul>
        <AddServiceForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Photos
        </h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {seller.photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={getPhotoUrl(p.storagePath)}
                alt={`${seller.businessName} portfolio photo`}
                fill
                className="object-cover"
                sizes="33vw"
              />
              <DeletePhotoButton photoId={p.id} storagePath={p.storagePath} />
            </div>
          ))}
        </div>
        <DashboardPhotoUploader remaining={LIMITS.maxPortfolioPhotos - seller.photos.length} />
      </section>
    </main>
  );
}
