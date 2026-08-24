type LeadTimeHint = {
  codice?: string | null;
  categoria?: string | null;
  descrizione?: string | null;
  nome?: string | null;
  disponibile?: boolean | null;
  stato?: string | null;
};

const BANDS: Array<{ re: RegExp; days: number[] }> = [
  { re: /cuscinett|bearing|guarniz|seal|oring|o-ring|boccola/i, days: [5, 7, 10] },
  { re: /fotocell|sensor|encoder|inverter|plc|rel[eè]|contattor/i, days: [10, 14, 21] },
  { re: /motoridutt|riduttore|motore|gearbox|servo/i, days: [21, 28, 35] },
  { re: /cinghia|tappeto|nastro|belt|intralox/i, days: [21, 30, 45] },
  { re: /sicurezz|serratur|interbloc|safety|rfid/i, days: [14, 21, 28] },
  { re: /valvol|pneumat|cilindr|elettrovalv|festo|smc/i, days: [7, 10, 14] },
  { re: /pignon|ruota dent|sprocket|catena|chain/i, days: [14, 21, 28] },
  { re: /ventosa|vuoto|vacuum|soffiett/i, days: [7, 10, 14] },
];

const DEFAULT_DAYS = [7, 10, 14, 21];
const STOCK_DAYS = [2, 3, 5];
const OBSOLETE_DAYS = [30, 45, 60];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(days: number[], seed: string): number {
  return days[hashSeed(seed) % days.length];
}

function haystack(part: LeadTimeHint): string {
  return [part.categoria, part.nome, part.descrizione, part.codice]
    .filter(Boolean)
    .join(" ");
}

/** Lead time demo stabile per codice (non casuale a ogni lettura). */
export function exampleLeadTimeDays(part: LeadTimeHint): number {
  const seed = (part.codice ?? haystack(part) ?? "part").trim().toUpperCase();
  if ((part.stato ?? "").toLowerCase() === "obsoleto") {
    return pick(OBSOLETE_DAYS, seed);
  }
  if (part.disponibile === true) {
    return pick(STOCK_DAYS, seed);
  }
  const text = haystack(part);
  const band = BANDS.find((b) => b.re.test(text));
  return pick(band?.days ?? DEFAULT_DAYS, seed);
}
