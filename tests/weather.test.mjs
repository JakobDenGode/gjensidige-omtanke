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
test("rain and sunshine do not suggest snow removal", () => {
  for (const symbol of ["rain", "clearsky_day"]) assert.equal(snowForecast(forecast(symbol), now).helpSuggested, false);
});
test("Oslo sleet symbols suggest optional help without falsely reporting snow", () => {
  for (const symbol of ["heavysleet", "lightsleet", "sleetshowers_night"]) {
    const result = snowForecast(forecast(symbol), now);
    assert.equal(result.snowExpected, false);
    assert.equal(result.sleetExpected, true);
    assert.equal(result.helpSuggested, true);
    assert.equal(result.samples[0].symbol, symbol);
  }
});
test("preserves source temperature and water-equivalent precipitation", () => {
  const data = forecast("heavysleet", undefined, "2026-11-12T12:00:00Z");
  data.properties.timeseries[0].data.instant = { details: { air_temperature: 1.7 } };
  data.properties.timeseries[0].data.next_1_hours.details = { precipitation_amount: 1.8 };
  const result = snowForecast(data, now);
  assert.equal(result.samples[0].temperature, 1.7);
  assert.equal(result.samples[0].precipitation, 1.8);
  assert.equal(result.winterAt, "2026-11-12T12:00:00Z");
});
test("partial coverage is not presented as a complete dry forecast", () => {
  assert.equal(snowForecast(forecast("cloudy"), now).completeCoverage, false);
  const data = forecast("cloudy");
  data.properties.timeseries = Array.from({ length: 25 }, (_, hour) => ({
    time: new Date(Date.parse("2026-11-12T12:00:00Z") + hour * 3600000).toISOString(),
    data: { next_1_hours: { summary: { symbol_code: "cloudy" } } },
  }));
  assert.equal(snowForecast(data, now).completeCoverage, true);
  data.properties.timeseries.splice(5, 1);
  assert.equal(snowForecast(data, now).completeCoverage, false);
});
test("outdated and missing data are errors, not clear weather", () => {
  assert.throws(() => snowForecast(forecast("snow", "2026-11-11T12:00:00Z"), now));
  assert.throws(() => snowForecast(forecast("snow", undefined, "2026-11-14T12:00:00Z"), now));
  assert.throws(() => snowForecast(forecast(undefined), now));
});

test("thaw advice uses forecast above-freezing temperatures, not insurance or flood claims", () => {
  const data = forecast("cloudy");
  data.properties.timeseries[0].data.instant = { details: { air_temperature: 2 } };
  assert.equal(snowForecast(data, now).thawExpected, true);
  data.properties.timeseries[0].data.instant.details.air_temperature = -2;
  assert.equal(snowForecast(data, now).thawExpected, false);
});
