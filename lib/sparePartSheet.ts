export function sparePartSheetPath(code: string) {
  return `/ricambi?codice=${encodeURIComponent(code.trim())}`;
}
