import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageResolutionHours,
  countGroups,
  formatResolutionHours,
  isOnOrAfter,
  periodStart,
} from "./ticketStats";

describe("statistiche ticket", () => {
  it("il periodo di 7 giorni esclude una data più vecchia", () => {
    const now = new Date("2026-10-04T12:00:00.000Z");
    const start = periodStart("7", now);
    assert.equal(isOnOrAfter("2026-10-01T12:00:00.000Z", start), true);
    assert.equal(isOnOrAfter("2026-09-01T12:00:00.000Z", start), false);
    assert.equal(isOnOrAfter("2026-09-01T12:00:00.000Z", periodStart("all", now)), true);
  });

  it("raggruppa e ordina per quantità", () => {
    assert.deepEqual(countGroups(["reso", "altro", "reso"]), [
      { key: "reso", count: 2 },
      { key: "altro", count: 1 },
    ]);
  });

  it("media solo i ticket risolti nel periodo", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const result = averageResolutionHours(
      [
        {
          createdAt: "2026-10-01T00:00:00.000Z",
          resolvedAt: "2026-10-02T00:00:00.000Z",
        },
        {
          createdAt: "2026-09-01T00:00:00.000Z",
          resolvedAt: "2026-09-03T00:00:00.000Z",
        },
        { createdAt: "2026-10-03T00:00:00.000Z", resolvedAt: null },
      ],
      start
    );
    assert.equal(result.count, 1);
    assert.equal(result.averageHours, 24);
  });

  it("formatta ore e giorni", () => {
    assert.equal(formatResolutionHours(null), "—");
    assert.equal(formatResolutionHours(10), "10,0 ore");
    assert.equal(formatResolutionHours(72), "3,0 giorni");
  });
});
