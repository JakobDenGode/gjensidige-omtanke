export type Forecast = {
  properties: {
    meta: { updated_at: string };
    timeseries: {
      time: string;
      data: {
        instant?: { details?: { air_temperature?: number } };
        next_1_hours?: {
          summary?: { symbol_code?: string };
          details?: { precipitation_amount?: number };
        };
      };
    }[];
  };
};

export function snowForecast(forecast: Forecast, now = Date.now()) {
  const updatedAt = forecast.properties.meta.updated_at;
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(updated) || now - updated > 6 * 60 * 60 * 1000 || updated > now + 60 * 60 * 1000) {
    throw new Error("Forecast is outdated");
  }
  const hours = forecast.properties.timeseries.filter((entry) => {
    const time = Date.parse(entry.time);
    return time >= now - 60 * 60 * 1000 && time < now + 24 * 60 * 60 * 1000;
  });
  if (!hours.length) throw new Error("Forecast has no current data");
  const covered = hours.filter((entry) => entry.data.next_1_hours?.summary?.symbol_code);
  if (!covered.length) throw new Error("Forecast has no hourly weather symbols");
  const samples = covered.sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).map((entry) => ({
    time: entry.time,
    symbol: entry.data.next_1_hours!.summary!.symbol_code!,
    temperature: entry.data.instant?.details?.air_temperature ?? null,
    precipitation: entry.data.next_1_hours?.details?.precipitation_amount ?? null,
  }));
  const snow = samples.find((entry) => entry.symbol.includes("snow"));
  const sleet = samples.find((entry) => entry.symbol.includes("sleet"));
  const firstWinter = samples.find((entry) => /snow|sleet/.test(entry.symbol));
  // A symbol describes the following hour, not a current observation.
  let coverageEnd = now;
  for (const sample of samples) {
    const start = Date.parse(sample.time);
    if (start > coverageEnd) break;
    coverageEnd = Math.max(coverageEnd, start + 60 * 60 * 1000);
  }
  return {
    snowExpected: Boolean(snow),
    sleetExpected: Boolean(sleet),
    helpSuggested: Boolean(firstWinter),
    winterAt: firstWinter?.time ?? null,
    snowAt: snow?.time ?? null,
    completeCoverage: coverageEnd >= now + 24 * 60 * 60 * 1000,
    updatedAt,
    samples,
  };
}

export type WeatherSummary = ReturnType<typeof snowForecast>;
