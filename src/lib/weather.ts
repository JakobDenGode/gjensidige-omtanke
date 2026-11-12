export type Forecast = {
  properties: {
    meta: { updated_at: string };
    timeseries: {
      time: string;
      data: { next_1_hours?: { summary?: { symbol_code?: string } } };
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
  const snow = covered.find((entry) => entry.data.next_1_hours!.summary!.symbol_code!.includes("snow"));
  return { snowExpected: Boolean(snow), snowAt: snow?.time ?? null, updatedAt };
}
