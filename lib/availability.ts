import { createClient } from "@/lib/supabase/server";
import {
  type AvailabilityRule,
  type OpenSlot,
  computeOpenSlots,
} from "@/lib/availabilityMath";

export type { AvailabilityRule, OpenSlot };

export async function getSellerAvailabilityRules(sellerId: string): Promise<AvailabilityRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_availability_rules")
    .select("id, day_of_week, start_time, end_time, slot_minutes")
    .eq("seller_id", sellerId)
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    slotMinutes: r.slot_minutes,
  }));
}

/** Open, bookable slots for a seller over the next 14 days, computed from
 * their recurring weekly rules minus any slot that already has a pending
 * or confirmed appointment. There's no background job materializing rows
 * for this -- it's recomputed on every read. The actual slot math lives in
 * lib/availabilityMath.ts (pure, unit-tested); this is just the DB wrapper. */
export async function getOpenSlots(sellerId: string): Promise<OpenSlot[]> {
  const supabase = await createClient();

  const rules = await getSellerAvailabilityRules(sellerId);
  if (rules.length === 0) return [];

  const now = new Date();

  // Visitors can't read other people's appointments (RLS), so the taken
  // start times come from get_taken_slots (0016): a narrow definer function
  // that returns only pending/confirmed start_at values for an approved
  // seller, over a window that covers BOOKING_WINDOW_DAYS.
  const { data: taken, error } = await supabase.rpc("get_taken_slots", {
    p_seller_id: sellerId,
  });
  if (error) throw error;

  // Compare by millisecond value, not raw string, since Postgres's
  // timestamptz string format doesn't necessarily match Date#toISOString().
  const takenTimesMs = ((taken ?? []) as { start_at: string }[]).map((t) => new Date(t.start_at).getTime());

  return computeOpenSlots(rules, takenTimesMs, now);
}
