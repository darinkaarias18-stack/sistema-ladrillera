export const BRICK_NAME_IMAGE_MAP: Record<string, string> = {
  "brick-1": "/images/catalog/brick-1.jpg",
  "brick-2": "/images/catalog/brick-2.jpg",
  "brick-3": "/images/catalog/brick-3.jpg",
  "brick-4": "/images/catalog/brick-4.jpg",
  "brick-5": "/images/catalog/brick-5.jpg",
  "brick-6": "/images/catalog/brick-6.jpg",
  "brick-7": "/images/catalog/brick-7.jpg",
  "brick-8": "/images/catalog/brick-8.jpg",
  "brick-9": "/images/catalog/brick-9.jpg",
  "brick-10": "/images/catalog/brick-10.jpg",
  "brick-11": "/images/catalog/brick-11.jpg",
  "brick-12": "/images/catalog/brick-12.jpg",
  "brick-13": "/images/catalog/brick-13.jpg",
  "brick-14": "/images/catalog/brick-14.jpg",
  "brick-15": "/images/catalog/brick-15.jpg",
  "brick-16": "/images/catalog/brick-16.jpg",
  "brick-17": "/images/catalog/brick-17.jpg",

  "ladrillo 6h normal de 1ra": "/images/catalog/brick-1.jpg",
  "ladrillo 6h normal de 2da": "/images/catalog/brick-2.jpg",
  "ladrillo 6h 25cm de 1ra": "/images/catalog/brick-3.jpg",
  "ladrillo 6h 25cm de 2da": "/images/catalog/brick-4.jpg",
  "ladrillo 6h cuadrado de 1ra": "/images/catalog/brick-5.jpg",
  "ladrillo 6h cuadrado de 2da": "/images/catalog/brick-6.jpg",
  "ladrillo 6h cuadrado partido": "/images/catalog/brick-7.jpg",
  "ladrillo grande rep de hornos": "/images/catalog/brick-8.jpg",
  "ladrillo grande repuesto de hornos": "/images/catalog/brick-8.jpg",
  "ladrillo 2h de 1ra": "/images/catalog/brick-9.jpg",
  "ladrillo 2h de 2da": "/images/catalog/brick-10.jpg",
  "adobitos maquina": "/images/catalog/brick-11.jpg",
  "adobitos máquina": "/images/catalog/brick-11.jpg",
  "adobitos manual": "/images/catalog/brick-12.jpg",
  "piso o tojo": "/images/catalog/brick-13.jpg",
  "piso o tojo cerámico": "/images/catalog/brick-13.jpg",
  "piso o tojo ceramico": "/images/catalog/brick-13.jpg",
  "bota agua casa": "/images/catalog/brick-14.jpg",
  "celosias estrella": "/images/catalog/brick-15.jpg",
  "celosías estrella": "/images/catalog/brick-15.jpg",
  "trabas": "/images/catalog/brick-16.jpg",
  "tejas": "/images/catalog/brick-17.jpg",
  "tejas coloniales": "/images/catalog/brick-17.jpg",
};

/**
 * Normaliza y devuelve la URL de imagen del catálogo para cualquier ladrillo
 * según su URL explícita, su ID, o su nombre.
 */
export function getBrickImageUrl(brick: { id?: string; name?: string; image_url?: string }): string | undefined {
  if (brick.image_url && brick.image_url.trim().length > 0) {
    return brick.image_url;
  }

  if (brick.id && BRICK_NAME_IMAGE_MAP[brick.id]) {
    return BRICK_NAME_IMAGE_MAP[brick.id];
  }

  if (brick.name) {
    const normalized = brick.name.toLowerCase().trim();
    if (BRICK_NAME_IMAGE_MAP[normalized]) {
      return BRICK_NAME_IMAGE_MAP[normalized];
    }

    // Búsqueda aproximada si contiene palabras clave
    for (const [key, url] of Object.entries(BRICK_NAME_IMAGE_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return url;
      }
    }
  }

  return undefined;
}
