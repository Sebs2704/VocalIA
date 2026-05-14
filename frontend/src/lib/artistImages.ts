import adele          from "@/assets/Artistas/Adele.jpeg";
import alexUbago      from "@/assets/Artistas/Alex ubago.webp";
import amyWinehouse   from "@/assets/Artistas/Amy winehouse.webp";
import celiaCruz      from "@/assets/Artistas/Celia_Cruz_1957_color.jpg";
import greeicy        from "@/assets/Artistas/Greeicy rendon.jpeg";
import joseanLog      from "@/assets/Artistas/Josean log.webp";
import jungKook       from "@/assets/Artistas/Jungkook.jpeg";
import kevinKaarl     from "@/assets/Artistas/Kevin kaarl.jpeg";
import lanaDelRey     from "@/assets/Artistas/Lana del rey.webp";
import laufey         from "@/assets/Artistas/Laufey.jpg";
import manuelMedrano  from "@/assets/Artistas/Manuel Medrano.webp";
import melendi        from "@/assets/Artistas/Melendi.jpeg";
import michaelJackson from "@/assets/Artistas/Michael jackson.jpg";
import miloJ          from "@/assets/Artistas/Milo j.webp";
import mitski         from "@/assets/Artistas/Mitski.jpg";
import paquita        from "@/assets/Artistas/Paquita la del barrio.jpeg";
import rihanna        from "@/assets/Artistas/Rihanna.jpeg";
import shakira        from "@/assets/Artistas/Shakira.webp";
import shawnMendes    from "@/assets/Artistas/Shawn mendes.webp";
import vicenteFdez    from "@/assets/Artistas/Vicente fernandez.webp";

const MAP: Record<string, string> = {
  "adele":                    adele,
  "alex ubago":               alexUbago,
  "amy winehouse":            amyWinehouse,
  "celia cruz":               celiaCruz,
  "greeicy":                  greeicy,
  "josean log":               joseanLog,
  "jung kook":                jungKook,
  "kevin kaarl":              kevinKaarl,
  "lana del rey":             lanaDelRey,
  "laufey":                   laufey,
  "manuel medrano":           manuelMedrano,
  "melendi":                  melendi,
  "michael jackson":          michaelJackson,
  "milo j":                   miloJ,
  "mitski":                   mitski,
  "paquita la del barrio":    paquita,
  "rihanna":                  rihanna,
  "shakira":                  shakira,
  "shawn mendes":             shawnMendes,
  "vicente fernandez":        vicenteFdez,
  "vicente fernández":        vicenteFdez,
};

/** Extrae el nombre del artista de "Canción - Artista" */
export function extractArtist(nombre: string): string {
  const idx = nombre.lastIndexOf(" - ");
  return idx >= 0 ? nombre.slice(idx + 3).trim() : nombre.trim();
}

/** Devuelve la URL de la imagen del artista, o undefined si no existe */
export function getArtistImage(nombre: string): string | undefined {
  const artist = extractArtist(nombre).toLowerCase();
  return MAP[artist];
}
