"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseClient } from "@/lib/supabase";

export function Avatar({
  userId,
  name,
  revision = 0,
}: {
  userId: string;
  name: string;
  revision?: number;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await createSupabaseClient()
        .storage.from("profile-photos")
        .createSignedUrl(`${userId}/avatar.jpg`, 60);
      if (active) {
        setUrl(data?.signedUrl ?? "");
        setFailed(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 50000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [userId, revision]);
  return (
    <span className="profile-avatar" aria-hidden="true">
      {url && !failed ? (
        <Image
          src={url}
          alt=""
          width={256}
          height={256}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        (name.trim()[0] || "?").toUpperCase()
      )}
    </span>
  );
}

export default function ProfilePhoto({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  return (
    <section className="request-record" aria-labelledby="photo-title">
      <h2 id="photo-title">Profilbilde</h2>
      <Avatar userId={userId} name={name} revision={revision} />
      <p className="note">
        Valgfritt. Synlig for deg, vennene dine og husstanden din. JPEG, PNG
        eller WebP, maks 5 MB. Bildet beskjæres til et kvadrat. Ikke last opp
        sensitive bilder.
      </p>
      <label htmlFor="profile-photo">Velg eller bytt bilde</label>
      <input
        id="profile-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || busy) return;
          setMessage("");
          setError("");
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
          ) {
            setError("Velg JPEG, PNG eller WebP på maks 5 MB.");
            return;
          }
          setBusy(true);
          try {
            const image = await createImageBitmap(file);
            try {
              if (
                !image.width ||
                !image.height ||
                image.width * image.height > 40000000
              )
                throw new Error("Image too large");
              const canvas = document.createElement("canvas");
              canvas.width = 256;
              canvas.height = 256;
              const context = canvas.getContext("2d");
              if (!context) throw new Error("Canvas unavailable");
              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, 256, 256);
              const edge = Math.min(image.width, image.height);
              context.drawImage(
                image,
                (image.width - edge) / 2,
                (image.height - edge) / 2,
                edge,
                edge,
                0,
                0,
                256,
                256,
              );
              // Re-encoding produces a small image without the original EXIF/location metadata.
              const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                  (value) =>
                    value
                      ? resolve(value)
                      : reject(new Error("Conversion failed")),
                  "image/jpeg",
                  0.85,
                ),
              );
              const { error } = await createSupabaseClient()
                .storage.from("profile-photos")
                .upload(`${userId}/avatar.jpg`, blob, {
                  contentType: "image/jpeg",
                  upsert: true,
                  cacheControl: "0",
                });
              if (error) throw error;
              setRevision((value) => value + 1);
              setMessage("Profilbildet er lagret.");
            } finally {
              image.close();
            }
          } catch {
            setError(
              "Kunne ikke lagre bildet. Prøv et mindre bilde og kontroller internettforbindelsen.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const { error } = await createSupabaseClient()
              .storage.from("profile-photos")
              .remove([`${userId}/avatar.jpg`]);
            if (error) throw error;
            setRevision((value) => value + 1);
            setMessage("Profilbildet er fjernet.");
          } catch {
            setError("Kunne ikke fjerne bildet. Prøv igjen.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Fjern profilbilde
      </button>
      <p role="status">{busy ? "Behandler bilde …" : message}</p>
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
    </section>
  );
}
