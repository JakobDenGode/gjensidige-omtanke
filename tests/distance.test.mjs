import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, formatDistance } from "../src/lib/distance.ts";

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

test("sub-kilometre distances are displayed in 100 metre increments", () => {
  assert.equal(formatDistance(0), "under 100 m");
  assert.equal(formatDistance(0.12), "100 m");
  assert.equal(formatDistance(0.26), "300 m");
  assert.equal(formatDistance(0.84), "800 m");
  assert.equal(formatDistance(0.99), "1000 m");
  assert.equal(formatDistance(1.23), "1,2 km");
});
