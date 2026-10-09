import { inflateRawSync, inflateSync } from "node:zlib";

/** Estrazione testo e selezione passaggi dai manuali caricati. Solo server. */

export { MANUAL_ACCEPT, MANUAL_MAX_BYTES } from "@/lib/manualLimits";

const TEXT_EXT = new Set(["txt", "md", "text"]);
const STORE_LIMIT = 250_000;
const PROMPT_BUDGET = 16_000;
const PROMPT_PER_MANUAL = 4_500;
const EXCERPT_LEN = 900;
const PASSAGE_LEN = 900;

const QUERY_STOP = new Set([
  "sono",
  "come",
  "questo",
  "questa",
  "della",
  "delle",
  "degli",
  "che",
  "non",
  "per",
  "con",
  "una",
  "uno",
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "hai",
  "nel",
  "nella",
  "sul",
  "sulla",
  "dei",
  "del",
  "alla",
  "alle",
  "gli",
  "what",
  "when",
  "your",
  "have",
]);

export type ManualExt = "pdf" | "txt" | "md" | "text";

export type ManualSource = {
  name: string;
  extractedText: string;
  textExtracted: boolean;
};

export function manualExt(name: string): ManualExt | null {
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (ext === "pdf" || TEXT_EXT.has(ext)) return ext as ManualExt;
  return null;
}

export function extractManualText(
  name: string,
  buffer: Buffer
): { text: string; extracted: boolean } {
  const ext = manualExt(name);
  if (!ext) return { text: "", extracted: false };

  const raw =
    ext === "pdf" ? extractPdfText(buffer) : decodePlainText(buffer);
  const text = clamp(normalizeExtracted(raw));
  const extracted = ext === "pdf" ? looksLikeProse(text) : text.length > 0;
  return { text: extracted ? text : "", extracted };
}

export function formatManualsForPrompt(
  manuals: ManualSource[],
  query: string
): string {
  const header = [
    "=== MANUALI CARICATI (sezione Manuale, fonte per la chat) ===",
    manuals.length === 0
      ? "(nessun manuale caricato per questa company)"
      : "Usa questi testi per uso, manutenzione, procedure e specifiche. Cita il nome del file e la pagina indicata tra parentesi quadre. Non inventare passaggi assenti dal testo.",
  ];
  if (manuals.length === 0) return header.join("\n");

  const unique = uniqueByName(manuals);
  const withText = unique.filter(hasText);
  let budget = PROMPT_BUDGET;
  const blocks: string[] = [];

  for (const manual of unique) {
    if (hasText(manual)) continue;
    const line = `\n[${manual.name}]\n(file salvato, testo non estratto: cita solo il nome, non il contenuto)`;
    blocks.push(line);
    budget -= line.length;
  }

  const ranked = rankPassages(withText, query);
  if (ranked.length > 0) {
    const picked: Passage[] = [];
    for (const { passage } of ranked) {
      const cost = passage.text.length + passage.manual.name.length + 24;
      if (cost > budget) continue;
      picked.push(passage);
      budget -= cost;
      if (budget < 200) break;
    }
    picked.sort(
      (a, b) =>
        withText.indexOf(a.manual) - withText.indexOf(b.manual) ||
        a.order - b.order
    );
    for (const passage of picked) {
      blocks.push(`\n[${passageLabel(passage)}]\n${passage.text}`);
    }
    const cited = new Set(picked.map((passage) => passage.manual));
    const others = withText.filter((manual) => !cited.has(manual));
    if (others.length > 0) {
      blocks.push(
        `\n(altri manuali senza passaggi pertinenti alla domanda: ${others.map((m) => m.name).join(", ")})`
      );
    }
    return [...header, ...blocks].join("\n");
  }

  const omitted: string[] = [];
  for (const manual of withText) {
    if (budget < 200) {
      omitted.push(manual.name);
      continue;
    }
    const body = excerptAround(
      manual.extractedText,
      0,
      Math.min(PROMPT_PER_MANUAL, budget)
    );
    const block = `\n[${manual.name}]\n${body}`;
    blocks.push(block);
    budget -= block.length;
  }
  if (omitted.length > 0) {
    blocks.push(
      `\n(altri manuali non inclusi per lunghezza: ${omitted.join(", ")})`
    );
  }
  return [...header, ...blocks].join("\n");
}

export type ManualHit = {
  name: string;
  excerpt: string;
  score: number;
  /** Pagina del PDF ([Pagina N] nel testo estratto), se nota. */
  page: number | null;
};

/** Passaggi dei manuali più vicini alla domanda, i più pertinenti prima. */
export function manualHits(
  manuals: ManualSource[],
  query: string,
  limit = 4
): ManualHit[] {
  const ranked = rankPassages(uniqueByName(manuals).filter(hasText), query);
  const best = ranked[0]?.score ?? 0;
  return ranked
    .filter(({ score }) => score >= best * 0.4)
    .slice(0, limit)
    .map(({ passage, score }) => ({
      name: passage.manual.name,
      page: passage.page,
      score,
      excerpt:
        passage.text.length > EXCERPT_LEN
          ? `${passage.text.slice(0, EXCERPT_LEN).trimEnd()}…`
          : passage.text,
    }));
}

/** Passaggio del manuale più vicino alla domanda. Null se non c'è testo utile. */
export function bestManualHit(
  manuals: ManualSource[],
  query: string
): ManualHit | null {
  return manualHits(manuals, query, 1)[0] ?? null;
}

type Passage = {
  manual: ManualSource;
  page: number | null;
  order: number;
  text: string;
  lower: string;
};

function hasText(manual: ManualSource): boolean {
  return manual.textExtracted && manual.extractedText.trim().length > 0;
}

/** Stesso file caricato più volte: tiene solo il primo (il più recente). */
function uniqueByName(manuals: ManualSource[]): ManualSource[] {
  const seen = new Set<string>();
  return manuals.filter((manual) => {
    const key = manual.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function passageLabel(passage: Passage): string {
  return passage.page == null
    ? passage.manual.name
    : `${passage.manual.name} — Pagina ${passage.page}`;
}

/** Divide il testo in passaggi brevi, rispettando i marcatori [Pagina N]. */
function passagesOf(manual: ManualSource): Passage[] {
  const text = manual.extractedText;
  const segments: { page: number | null; body: string }[] = [];
  const pageRe = /\[Pagina (\d+)\]/g;
  let page: number | null = null;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pageRe.exec(text))) {
    segments.push({ page, body: text.slice(last, match.index) });
    page = Number(match[1]);
    last = match.index + match[0].length;
  }
  segments.push({ page, body: text.slice(last) });

  const out: Passage[] = [];
  const push = (pageNo: number | null, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    out.push({
      manual,
      page: pageNo,
      order: out.length,
      text: trimmed,
      lower: trimmed.toLowerCase(),
    });
  };
  for (const segment of segments) {
    let buffer = "";
    for (const raw of segment.body.split(/\n{2,}/)) {
      let para = raw.trim();
      if (!para) continue;
      if (buffer && buffer.length + para.length + 2 > PASSAGE_LEN) {
        push(segment.page, buffer);
        buffer = "";
      }
      while (para.length > PASSAGE_LEN * 1.5) {
        const cut = para.lastIndexOf(" ", PASSAGE_LEN);
        const at = cut > PASSAGE_LEN / 2 ? cut : PASSAGE_LEN;
        push(segment.page, para.slice(0, at));
        para = para.slice(at).trim();
      }
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
    push(segment.page, buffer);
  }
  return out;
}

/** Passaggi ordinati per pertinenza: termini rari nel manuale pesano di più. */
function rankPassages(
  manuals: ManualSource[],
  query: string
): { passage: Passage; score: number }[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const passages = manuals.flatMap(passagesOf);
  if (passages.length === 0) return [];

  const patterns = terms.map(
    (term) =>
      new RegExp(
        `(?:^|[^a-z0-9à-ÿ])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g"
      )
  );
  const counts = passages.map((passage) =>
    patterns.map((pattern) => passage.lower.match(pattern)?.length ?? 0)
  );
  const weights = patterns.map((_, i) => {
    const df = counts.filter((row) => row[i] > 0).length;
    return df === 0 ? 0 : Math.log(1 + passages.length / df);
  });

  return passages
    .map((passage, index) => {
      let score = 0;
      counts[index].forEach((count, i) => {
        if (count > 0) score += weights[i] * (1 + 0.15 * Math.min(count - 1, 4));
      });
      return { passage, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.passage.order - b.passage.order);
}

function excerptAround(text: string, index: number, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const start = Math.max(0, index - Math.floor(maxLen * 0.2));
  let slice = text.slice(start, start + maxLen);
  if (start > 0) {
    const cut = slice.search(/\s/);
    if (cut > 0 && cut < 80) slice = slice.slice(cut + 1);
    slice = `…${slice}`;
  }
  if (start + maxLen < text.length) slice = `${slice.trimEnd()}…`;
  return slice;
}

/** Parole della domanda ridotte alla radice (montanti → montan), codici con cifre interi. */
function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of query.toLowerCase().split(/[^a-z0-9àèéìòù]+/i)) {
    if (raw.length < 4 || QUERY_STOP.has(raw)) continue;
    const term = /\d/.test(raw)
      ? raw
      : raw.length >= 7
        ? raw.slice(0, -2)
        : raw.length >= 5
          ? raw.slice(0, -1)
          : raw;
    if (seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

/** Testo pronto per extractedText: normalizzato, senza surrogati orfani, entro il limite. */
export function cleanManualText(text: string): string {
  return clamp(
    normalizeExtracted(text)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
  );
}

function clamp(text: string): string {
  return text.length > STORE_LIMIT ? text.slice(0, STORE_LIMIT) : text;
}

function normalizeExtracted(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

function looksLikeProse(text: string): boolean {
  const letters = text.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
  if (letters < 24) return false;
  const controls =
    text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g)?.length ?? 0;
  if (controls > text.length * 0.02) return false;
  return letters / text.length > 0.2;
}

function decodePlainText(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const parts: string[] = [];
  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  let streams = 0;
  while ((match = streamRe.exec(raw)) && streams < 400) {
    streams += 1;
    const windowStart = Math.max(0, match.index - 800);
    const dictSlice = raw.slice(windowStart, match.index);
    const rel = dictSlice.lastIndexOf("<<");
    const dict = rel >= 0 ? dictSlice.slice(rel) : "";
    if (/DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode/.test(dict)) continue;

    const start = match.index + match[0].length;
    const lengthMatch = dict.match(/\/Length\s+(\d+)/);
    let end = start;
    if (lengthMatch) {
      end = start + Number(lengthMatch[1]);
    } else {
      const marker = raw.indexOf("endstream", start);
      if (marker < 0) continue;
      end = marker;
      if (raw[end - 1] === "\n") end -= 1;
      if (raw[end - 1] === "\r") end -= 1;
    }
    if (end <= start || end > buffer.length) continue;

    const slice = buffer.subarray(start, end);
    let decoded: string | null = null;
    if (/FlateDecode/.test(dict)) {
      decoded = inflatePdf(slice);
    } else if (!/\/Filter/.test(dict)) {
      decoded = slice.toString("latin1");
    }
    if (!decoded || !/Tj|TJ|\bBT\b/.test(decoded)) continue;
    const text = textFromPdfContent(decoded);
    if (text) parts.push(text);
  }
  return parts.join("\n");
}

function inflatePdf(bytes: Buffer): string | null {
  const candidates = [bytes];
  if (bytes.length > 2) candidates.push(bytes.subarray(0, bytes.length - 1));
  for (const candidate of candidates) {
    try {
      return inflateSync(candidate).toString("latin1");
    } catch {
      try {
        return inflateRawSync(candidate).toString("latin1");
      } catch {
        // Prova il candidato successivo.
      }
    }
  }
  return null;
}

function textFromPdfContent(content: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "(") {
      const lit = readLiteral(content, i);
      if (/^\s*(Tj|'|")/.test(content.slice(lit.next, lit.next + 6))) {
        parts.push(lit.text);
      }
      i = lit.next;
      continue;
    }
    if (ch === "<" && content[i + 1] !== "<") {
      const hex = readHexString(content, i);
      if (!hex) {
        i += 1;
        continue;
      }
      if (/^\s*(Tj|'|")/.test(content.slice(hex.next, hex.next + 6))) {
        parts.push(hex.text);
      }
      i = hex.next;
      continue;
    }
    if (ch === "[") {
      const end = indexOfArrayEnd(content, i);
      if (end < 0) break;
      if (/^\s*TJ/.test(content.slice(end + 1, end + 6))) {
        parts.push(literalsAndGaps(content.slice(i + 1, end)));
      }
      i = end + 1;
      continue;
    }
    i++;
  }
  return parts.join(" ");
}

function literalsAndGaps(arrayBody: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < arrayBody.length) {
    if (arrayBody[i] === "(") {
      const lit = readLiteral(arrayBody, i);
      parts.push(lit.text);
      i = lit.next;
      continue;
    }
    if (arrayBody[i] === "<" && arrayBody[i + 1] !== "<") {
      const hex = readHexString(arrayBody, i);
      if (!hex) {
        i += 1;
        continue;
      }
      parts.push(hex.text);
      i = hex.next;
      continue;
    }
    const num = arrayBody.slice(i).match(/^-?\d+(?:\.\d+)?/);
    if (num && Number(num[0]) <= -150) parts.push(" ");
    i += num ? num[0].length : 1;
  }
  return parts.join("");
}

function indexOfArrayEnd(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") {
      i = readLiteral(source, i).next - 1;
      continue;
    }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function readLiteral(
  source: string,
  start: number
): { text: string; next: number } {
  let i = start + 1;
  let depth = 1;
  let out = "";
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === "\\") {
      const next = source[i + 1];
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === "b") out += "\b";
      else if (next === "f") out += "\f";
      else if (next === "(" || next === ")" || next === "\\") out += next;
      else if (next === "\n" || next === "\r") {
        i += 2;
        continue;
      } else if (next >= "0" && next <= "7") {
        let oct = next;
        let j = i + 2;
        for (
          let k = 0;
          k < 2 && j < source.length && source[j] >= "0" && source[j] <= "7";
          k++, j++
        ) {
          oct += source[j];
        }
        out += String.fromCharCode(parseInt(oct, 8));
        i = j;
        continue;
      } else if (next) {
        out += next;
      }
      i += 2;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { text: decodePdfString(out), next: i + 1 };
      out += ch;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return { text: decodePdfString(out), next: i };
}

function readHexString(
  source: string,
  start: number
): { text: string; next: number } | null {
  if (source[start] !== "<") return null;
  const end = source.indexOf(">", start + 1);
  if (end < 0 || end - start > 200_000) return null;
  const hex = source.slice(start + 1, end).replace(/\s+/g, "");
  if (hex.length < 2 || !/^[0-9A-Fa-f]+$/.test(hex)) return null;
  let raw = "";
  for (let i = 0; i + 1 < hex.length; i += 2) {
    raw += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return { text: decodePdfString(raw), next: end + 1 };
}

function decodePdfString(value: string): string {
  if (value.length >= 2 && value.charCodeAt(0) === 0xfe && value.charCodeAt(1) === 0xff) {
    let utf = "";
    for (let i = 2; i + 1 < value.length; i += 2) {
      utf += String.fromCharCode((value.charCodeAt(i) << 8) | value.charCodeAt(i + 1));
    }
    return utf;
  }
  return value;
}
