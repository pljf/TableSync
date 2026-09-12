import { photos, type Photo } from "@/lib/photo-library";

const dishPhotos = new Map(
  photos
    .filter((photo) => photo.id !== "shared-table" && photo.id !== "table-preparation")
    .map((photo) => [photo.id, photo])
);

/** Unphotographed recipes use an icon, never a photograph of a different meal. */
export function dishPhotography(id: string): Photo | undefined {
  return dishPhotos.get(id);
}
