"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validation";
import { normalizeSaWhatsappNumber } from "@/lib/phone";
import { LIMITS } from "@/config";

async function requireOwnSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, seller: null };

  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { supabase, user, seller };
}

export async function updateSellerBasicInfo(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const businessName = String(formData.get("businessName") ?? "").trim();
  if (businessName.length < 2) return { error: "Business name is too short." };

  const whatsappNumber = normalizeSaWhatsappNumber(String(formData.get("whatsappNumber") ?? ""));
  if (!whatsappNumber) return { error: "That doesn't look like a valid SA WhatsApp number." };

  const bio = String(formData.get("bio") ?? "").trim().slice(0, LIMITS.bioMaxChars);
  const areaNote = String(formData.get("areaNote") ?? "").trim();
  const instagramHandle = String(formData.get("instagramHandle") ?? "").trim();

  const { error } = await supabase
    .from("sellers")
    .update({
      business_name: businessName,
      bio: bio || null,
      area_note: areaNote || null,
      instagram_handle: instagramHandle || null,
      whatsapp_number: whatsappNumber,
    })
    .eq("id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function addService(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    priceFrom: formData.get("priceFrom"),
    priceTo: formData.get("priceTo") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid service." };

  const { error } = await supabase.from("services").insert({
    seller_id: seller.id,
    name: parsed.data.name,
    price_from: parsed.data.priceFrom,
    price_to: parsed.data.priceTo ?? null,
    duration_minutes: parsed.data.durationMinutes ?? null,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function deleteService(serviceId: string): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function addPhotos(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const { count } = await supabase
    .from("seller_photos")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", seller.id);
  const currentCount = count ?? 0;

  const files = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, Math.max(0, LIMITS.maxPortfolioPhotos - currentCount));

  let sortOrder = currentCount;
  for (const file of files) {
    const path = `${seller.id}/${sortOrder}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("seller-photos")
      .upload(path, file, { contentType: "image/jpeg" });
    if (uploadError) return { error: uploadError.message };

    const { error: rowError } = await supabase
      .from("seller_photos")
      .insert({ seller_id: seller.id, storage_path: path, sort_order: sortOrder });
    if (rowError) return { error: rowError.message };
    sortOrder++;
  }

  revalidatePath("/dashboard");
  return {};
}

export async function deletePhoto(photoId: string, storagePath: string): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  await supabase.storage.from("seller-photos").remove([storagePath]);
  const { error } = await supabase
    .from("seller_photos")
    .delete()
    .eq("id", photoId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}
