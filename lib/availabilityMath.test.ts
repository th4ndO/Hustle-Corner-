import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_WINDOW_DAYS,
  addDays,
  computeOpenSlots,
  sastDatePartsFor,
  sastToUtc,
  type AvailabilityRule,
} from "./availabilityMath";

// Monday 2026-10-05 08:00 SAST (06:00 UTC).
const MONDAY_8AM_SAST = new Date("2026-10-05T06:00:00Z");

const mondayMorning: AvailabilityRule = {
  id: "r1",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "12:00",
  slotMinutes: 60,
};

test("SAST <-> UTC conversion is a fixed +2h", () => {
  assert.equal(sastToUtc(2026, 10, 5, 9, 0).toISOString(), "2026-10-05T07:00:00.000Z");
  // 23:30 UTC on Sunday is already Monday in SAST.
  const parts = sastDatePartsFor(new Date("2026-10-04T23:30:00Z"));
  assert.deepEqual(parts, { year: 2026, month: 10, day: 5, dow: 1 });
});

test("addDays rolls over month ends", () => {
  assert.deepEqual(addDays({ year: 2026, month: 10, day: 30, dow: 5 }, 3), { year: 2026, month: 11, day: 2, dow: 1 });
});

test("no rules means no slots", () => {
  assert.deepEqual(computeOpenSlots([], [], MONDAY_8AM_SAST), []);
});

test("splits a rule into slots and repeats it weekly within the window", () => {
  const slots = computeOpenSlots([mondayMorning], [], MONDAY_8AM_SAST);
  // Two Mondays fall inside a 14-day window starting on a Monday: 3 slots each.
  assert.equal(slots.length, 6);
  assert.deepEqual(slots[0], { startAt: "2026-10-05T07:00:00.000Z", endAt: "2026-10-05T08:00:00.000Z" });
  assert.equal(slots[3].startAt, "2026-10-12T07:00:00.000Z");
});

test("drops slots that are already taken", () => {
  const taken = [new Date("2026-10-05T08:00:00.000Z").getTime()]; // the 10:00 SAST slot
  const slots = computeOpenSlots([mondayMorning], taken, MONDAY_8AM_SAST);
  assert.equal(slots.length, 5);
  assert.ok(!slots.some((s) => s.startAt === "2026-10-05T08:00:00.000Z"));
});

test("drops slots that have already started", () => {
  const tenThirty = new Date("2026-10-05T08:30:00Z"); // 10:30 SAST
  const slots = computeOpenSlots([mondayMorning], [], tenThirty);
  // Today's 09:00 and 10:00 are gone; 11:00 today plus next Monday's three remain.
  assert.equal(slots[0].startAt, "2026-10-05T09:00:00.000Z");
  assert.equal(slots.length, 4);
});

test("a slot that doesn't fit before the end time is not offered", () => {
  const slots = computeOpenSlots([{ ...mondayMorning, slotMinutes: 90 }], [], MONDAY_8AM_SAST);
  // 09:00-10:30 fits, 10:30-12:00 fits, nothing after: 2 per Monday.
  assert.equal(slots.length, 4);
});

test("window length matches the booking window", () => {
  const everyDay: AvailabilityRule[] = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    ...mondayMorning,
    id: `d${dow}`,
    dayOfWeek: dow,
    startTime: "13:00",
    endTime: "14:00",
  }));
  assert.equal(computeOpenSlots(everyDay, [], MONDAY_8AM_SAST).length, BOOKING_WINDOW_DAYS);
});
