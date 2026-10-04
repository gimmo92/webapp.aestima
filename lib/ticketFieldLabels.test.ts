import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_TICKET_FIELD_LABELS,
  ticketFieldLabelsFromSettings,
} from "./ticketFieldLabels";

describe("ticketFieldLabelsFromSettings", () => {
  it("senza impostazioni resta Macchina e Matricola", () => {
    assert.deepEqual(ticketFieldLabelsFromSettings(null), DEFAULT_TICKET_FIELD_LABELS);
    assert.deepEqual(ticketFieldLabelsFromSettings({}), DEFAULT_TICKET_FIELD_LABELS);
  });

  it("accetta i nomi salvati dall'azienda", () => {
    assert.deepEqual(
      ticketFieldLabelsFromSettings({
        ticketFieldLabels: {
          machineModel: "Prodotto",
          machineSerial: "Commessa / Ordine",
        },
      }),
      { machineModel: "Prodotto", machineSerial: "Commessa / Ordine" }
    );
  });

  it("un nome vuoto torna al default", () => {
    assert.deepEqual(
      ticketFieldLabelsFromSettings({
        ticketFieldLabels: { machineModel: "  ", machineSerial: "Commessa" },
      }),
      { machineModel: "Macchina", machineSerial: "Commessa" }
    );
  });
});
