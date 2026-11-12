import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { snowForecast, type Forecast } from "@/lib/weather";

async function loadForecast(lat: string, lon: string) {
  "use cache";
  const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
    headers: { "User-Agent": "GjensidigeOmtanke/0.1 https://github.com/JakobDenGode/gjensidige-omtanke" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Weather provider unavailable");
  const expires = Date.parse(response.headers.get("expires") ?? "");
  const seconds = Number.isFinite(expires) ? Math.max(600, Math.ceil((expires - Date.now()) / 1000)) : 3600;
  cacheLife({ stale: seconds, revalidate: seconds, expire: seconds + 60 });
  return await response.json() as Forecast;
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "Tjenesten er ikke konfigurert." }, { status: 503, headers });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: "Logg inn for å hente været." }, { status: 401, headers });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Logg inn på nytt." }, { status: 401, headers });
  let coordinates;
  try { coordinates = await request.json(); } catch {
    return Response.json({ error: "Ugyldig sted." }, { status: 400, headers });
  }
  const { lat, lon } = coordinates ?? {};
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 57 || lat > 72 || lon < 4 || lon > 32) {
    return Response.json({ error: "Velg et sted i Fastlands-Norge." }, { status: 400, headers });
  }
  try {
    // Coarse coordinates reduce location precision and share forecast cache entries.
    const forecast = await loadForecast(lat.toFixed(2), lon.toFixed(2));
    return Response.json(snowForecast(forecast), { headers });
  } catch {
    return Response.json({ error: "Kunne ikke hente et oppdatert værvarsel. Prøv igjen senere." }, { status: 503, headers });
  }
}
