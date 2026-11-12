import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm } from "../src/lib/distance.ts";

test("same postal location is zero", () => {
  assert.equal(distanceKm({ lat: 59.91, lon: 10.75 }, { lat: 59.91, lon: 10.75 }), 0);
});
test("one degree latitude is roughly 111 km", () => {
  const distance = distanceKm({ lat: 59, lon: 10 }, { lat: 60, lon: 10 });
  assert.ok(distance > 111 && distance < 112);
});
test("distance is symmetric", () => {
  const a = { lat: 59.91, lon: 10.75 }, b = { lat: 59.92, lon: 10.76 };
  assert.ok(Math.abs(distanceKm(a, b) - distanceKm(b, a)) < 0.000001);
});
