import type { MetadataRoute } from "next";

// Sistema interno: ningún buscador debe indexar nada (S-01).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
