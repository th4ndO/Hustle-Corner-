"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, reportSchema } from "@/lib/validation";

export async function submitReview(
  sellerId: string,
  slug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to leave a review." };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your review and try again." };
  }

  const { error } = await supabase.from("reviews").insert({
    seller_id: sellerId,
    author_id: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already reviewed this seller." };
    return { error: error.message };
  }

  revalidatePath(`/s/${slug}`);
  return {};
}

export async function deleteOwnReview(reviewId: string, slug: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("author_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/s/${slug}`);
  return {};
}

export async function submitReport(
  sellerId: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to report a listing." };

  const parsed = reportSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please describe the issue." };
  }

  const { error } = await supabase.from("reports").insert({
    seller_id: sellerId,
    reporter_id: user.id,
    reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  return { success: true };
}
