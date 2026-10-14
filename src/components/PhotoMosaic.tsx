"use client";
import { destinationGallery } from "@/services/images";
import { OrnamentRow } from "./theme";
import { PhotoCredit } from "./ui";

/** Magazine-style collage of licensed destination photos. Renders nothing for destinations without photos. */
export function PhotoMosaic({ catalogKey, name }: { catalogKey?: string; name: string }) {
  const photos = destinationGallery(catalogKey, 6).slice(1); // hero is already shown above
  if (photos.length < 3) return null;
  return (
    <section className="mosaic-wrap" aria-label={`Photos of ${name}`}>
      <ul className={`mosaic mosaic-${Math.min(photos.length, 5)}`}>
        {photos.slice(0, 5).map((p, i) => (
          <li key={p.src} className={`mosaic-item m${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.title.replace(/\.[a-z]+$/i, "").replace(/[_-]/g, " ")} loading="lazy" />
            <PhotoCredit credit={p} />
          </li>
        ))}
      </ul>
      <OrnamentRow size={24} />
    </section>
  );
}
