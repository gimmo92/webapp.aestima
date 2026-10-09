import { inflateRawSync, inflateSync } from "node:zlib";

/** Estrazione testo e selezione passaggi dai manuali caricati. */

export const MANUAL_MAX_BYTES = 12 * 1024 * 1024;
export const MANUAL_ACCEPT = ".pdf,.txt,.md,.text";

const TEXT_EXT = new Set(["txt", "md", "text"]);
const STORE_LIMIT = 80_000;
const PROMPT_BUDGET = 16_000;
const PROMPT_PER_MANUAL = 4_500;
const EXCERPT_LEN = 900;

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
      : "Usa questi testi per uso, manutenzione, procedure e specifiche. Cita il nome del file. Non inventare passaggi assenti dal testo.",
  ];
  if (manuals.length === 0) return header.join("\n");

  const tokens = queryTokens(query);
  const ranked = manuals
    .map((manual, index) => ({
      manual,
      index,
      score: scoreManual(manual, tokens),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  let budget = PROMPT_BUDGET;
  const blocks: string[] = [];
  const omitted: string[] = [];

  for (const { manual } of ranked) {
    if (budget < 200) {
      omitted.push(manual.name);
      continue;
    }
    if (!manual.textExtracted || !manual.extractedText.trim()) {
      const line = `\n[${manual.name}]\n(file salvato, testo non estratto: cita solo il nome, non il contenuto)`;
      blocks.push(line);
      budget -= line.length;
      continue;
    }
    const take = Math.min(PROMPT_PER_MANUAL, budget);
    const at = tokens.length
      ? firstTokenIndex(manual.extractedText, tokens)
      : 0;
    const body = excerptAround(manual.extractedText, at, take);
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

/** Passaggio del manuale più vicino alla domanda. Null se non c'è testo utile. */
export function bestManualHit(
  manuals: ManualSource[],
  query: string
): { name: string; excerpt: string; score: number } | null {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return null;

  let best: { name: string; excerpt: string; score: number } | null = null;
  for (const manual of manuals) {
    if (!manual.textExtracted || !manual.extractedText) continue;
    const score = scoreManual(manual, tokens);
    if (score === 0) continue;
    const excerpt = excerptAround(
      manual.extractedText,
      firstTokenIndex(manual.extractedText, tokens),
      EXCERPT_LEN
    );
    if (!best || score > best.score) {
      best = { name: manual.name, excerpt, score };
    }
  }
  return best;
}

function scoreManual(manual: ManualSource, tokens: string[]): number {
  if (!manual.textExtracted || !manual.extractedText || tokens.length === 0) {
    return 0;
  }
  const lower = manual.extractedText.toLowerCase();
  const name = manual.name.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 1;
    if (name.includes(token)) score += 1;
  }
  return score;
}

function firstTokenIndex(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  let at = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0 && (at < 0 || idx < at)) at = idx;
  }
  return at < 0 ? 0 : at;
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

function queryTokens(query: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of query.toLowerCase().split(/[^a-z0-9àèéìòù]+/i)) {
    if (raw.length < 4 || QUERY_STOP.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
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
  while ((match = streamRe.exec(raw))) {
    const dictStart = raw.lastIndexOf("<<", match.index);
    const dict = dictStart >= 0 ? raw.slice(dictStart, match.index) : "";
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
