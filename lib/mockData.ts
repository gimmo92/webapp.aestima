import type { Machine } from "./types";

// Anagrafica macchine + BOM: popolabile da ERP / gestionale / PLM.
export const MACHINES: Machine[] = [];

/** Testo iniziale della pagina "Crea offerta" (vuoto). */
export const SAMPLE_REQUEST = "";

/** Dati azienda per la carta intestata del preventivo. */
export const COMPANY = {
  name: "Aestima S.r.l.",
  tagline: "Ricambi industriali & assistenza tecnica",
  address: "Via dell'Industria 42, 36100 Vicenza (VI)",
  vat: "P.IVA IT0 4821570248",
  email: "preventivi@aestima.demo",
  phone: "+39 0444 000 000",
};
