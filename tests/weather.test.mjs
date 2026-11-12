import test from "node:test";
import assert from "node:assert/strict";
import { snowForecast } from "../src/lib/weather.ts";

const now = Date.parse("2026-11-12T12:15:00Z");
function forecast(symbol, updated = "2026-11-12T12:00:00Z", time = "2026-11-12T13:00:00Z") {
  return { properties: { meta: { updated_at: updated }, timeseries: [{ time, data: { next_1_hours: { summary: { symbol_code: symbol } } } }] } };
}
test("snow and snow showers trigger a suggestion", () => {
  for (const symbol of ["snow", "lightsnowshowers_day", "heavysnow"]) assert.equal(snowForecast(forecast(symbol), now).snowExpected, true);
});
test("rain, sleet and sunshine do not imply snow removal", () => {
  for (const symbol of ["rain", "sleet", "clearsky_day"]) assert.equal(snowForecast(forecast(symbol), now).snowExpected, false);
});
test("outdated and missing data are errors, not clear weather", () => {
  assert.throws(() => snowForecast(forecast("snow", "2026-11-11T12:00:00Z"), now));
  assert.throws(() => snowForecast(forecast("snow", undefined, "2026-11-14T12:00:00Z"), now));
  assert.throws(() => snowForecast(forecast(undefined), now));
});
