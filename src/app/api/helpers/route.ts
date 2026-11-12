import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { distanceKm } from "@/lib/distance";

async function postalLocation(code: string) {
  "use cache";
  cacheLife("days");
  if (!/^\d{4}$/.test(code)) return null;
  const response = await fetch(`https://api.zippopotam.us/no/${code}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Postal lookup unavailable");
  const data = await response.json();
  const place = data.places?.[0];
  const lat = Number(place?.latitude),
    lon = Number(place?.longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 57 &&
    lat <= 72 &&
    lon >= 4 &&
    lon <= 32
    ? { lat, lon }
    : null;
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return Response.json(
      { error: "Tjenesten er ikke konfigurert." },
      { status: 503, headers },
    );
  if (!token)
    return Response.json(
      { error: "Logg inn først." },
      { status: 401, headers },
    );
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user)
    return Response.json(
      { error: "Logg inn på nytt." },
      { status: 401, headers },
    );
  try {
    const [profile, helpers, locations] = await Promise.all([
      supabase
        .from("customer_profiles")
        .select("postal_code")
        .eq("user_id", auth.user.id)
        .single(),
      supabase.rpc("available_helpers"),
      supabase.rpc("helper_search_locations"),
    ]);
    if (profile.error || helpers.error || locations.error)
      throw new Error("Database lookup failed");
    const origin = await postalLocation(profile.data.postal_code);
    if (!origin)
      return Response.json(
        {
          error:
            "Legg inn et gyldig postnummer under Min profil for å finne hjelpere i nærheten.",
        },
        { status: 422, headers },
      );
    const matches: {
      member_id: string;
      distance_km: number;
      travel_km: number;
    }[] = [];
    let missingLocations = 0;
    // Bound concurrent external requests; shared postal areas are cached.
    const rows = locations.data as {
      member_id: string;
      postal_code: string;
      travel_km: number;
    }[];
    for (let index = 0; index < rows.length; index += 5) {
      await Promise.all(
        rows.slice(index, index + 5).map(async (row) => {
          const destination = await postalLocation(row.postal_code);
          if (!destination) {
            missingLocations++;
            return;
          }
          const distance = distanceKm(origin, destination);
          if (distance <= row.travel_km)
            matches.push({
              member_id: row.member_id,
              distance_km: distance,
              travel_km: row.travel_km,
            });
        }),
      );
    }
    const result = (helpers.data as { member_id: string }[])
      .flatMap((helper) => {
        const match = matches.find(
          (item) => item.member_id === helper.member_id,
        );
        return match ? [{ ...helper, ...match }] : [];
      })
      .sort((a, b) => a.distance_km - b.distance_km);
    return Response.json({ helpers: result, missingLocations }, { headers });
  } catch {
    return Response.json(
      { error: "Kunne ikke beregne avstander. Prøv igjen senere." },
      { status: 503, headers },
    );
  }
}
