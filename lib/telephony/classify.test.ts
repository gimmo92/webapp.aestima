import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autoAppliedChoice,
  parseClassification,
  resolveAssignmentStatus,
  statusAfterConfirm,
  withDepartment,
  DEFAULT_CATEGORY_ROUTING,
} from "./classify";

const valid = `{
  "category": "pezzo_mancante",
  "urgency": "alta",
  "summary": "Manca un modulo intermedio della scala rispetto all'ordine 4412.",
  "product": "Scala modulare",
  "orderNumber": "4412",
  "partCodes": ["SC-INT-90"],
  "suggestedAction": "Verificare la distinta e spedire il modulo.",
  "confidence": 0.91
}`;

describe("parseClassification", () => {
  it("accetta il JSON e ignora testo intorno", () => {
    const parsed = parseClassification(`Ecco il risultato:\n${valid}\nFine.`);
    assert.ok(parsed);
    assert.equal(parsed?.category, "pezzo_mancante");
    assert.equal(parsed?.urgency, "alta");
    assert.equal(parsed?.product, "Scala modulare");
    assert.equal(parsed?.orderNumber, "4412");
    assert.deepEqual(parsed?.partCodes, ["SC-INT-90"]);
    assert.equal(parsed?.confidence, 0.91);
  });

  it("rifiuta una categoria fuori schema", () => {
    const parsed = parseClassification(
      valid.replace("pezzo_mancante", "guasto_generico")
    );
    assert.equal(parsed, null);
  });

  it("rifiuta JSON senza riepilogo o con confidenza non numerica", () => {
    assert.equal(
      parseClassification(valid.replace(/"summary": ".*",/, '"summary": "",')),
      null
    );
    assert.equal(
      parseClassification(valid.replace('"confidence": 0.91', '"confidence": "alta"')),
      null
    );
  });

  it("tiene i codici pezzo solo se sono stringhe", () => {
    const parsed = parseClassification(
      valid.replace('["SC-INT-90"]', '["SC-INT-90", 12, " "]')
    );
    assert.deepEqual(parsed?.partCodes, ["SC-INT-90"]);
  });
});

describe("reparto e conferma", () => {
  it("assegna il reparto dalla mappa, non dal modello", () => {
    const parsed = parseClassification(valid);
    assert.ok(parsed);
    const proposal = withDepartment(parsed, DEFAULT_CATEGORY_ROUTING);
    assert.equal(proposal.department, "logistica");
  });

  it("sopra soglia con reparto porta il ticket in Assegnato", () => {
    assert.equal(
      statusAfterConfirm({
        currentStatus: "aperto",
        confidence: 0.8,
        threshold: 0.65,
        department: "commerciale",
      }),
      "assegnato"
    );
  });

  it("senza reparto e senza tecnico non diventa Assegnato", () => {
    assert.equal(
      resolveAssignmentStatus({
        currentStatus: "aperto",
        requestedStatus: "assegnato",
        department: null,
        technicianId: null,
      }),
      "aperto"
    );
    assert.equal(
      resolveAssignmentStatus({
        currentStatus: "in_lavorazione",
        requestedStatus: "assegnato",
        department: null,
        technicianId: null,
      }),
      "in_lavorazione"
    );
  });

  it("togliere tecnico e reparto da Assegnato riporta a Da assegnare", () => {
    assert.equal(
      resolveAssignmentStatus({
        currentStatus: "assegnato",
        requestedStatus: "assegnato",
        department: null,
        technicianId: null,
      }),
      "aperto"
    );
  });

  it("un reparto basta per restare Assegnato", () => {
    assert.equal(
      resolveAssignmentStatus({
        currentStatus: "aperto",
        requestedStatus: "assegnato",
        department: "logistica",
        technicianId: null,
      }),
      "assegnato"
    );
  });

  it("sotto soglia resta Da assegnare", () => {
    assert.equal(
      statusAfterConfirm({
        currentStatus: "aperto",
        confidence: 0.4,
        threshold: 0.65,
        department: "logistica",
      }),
      "aperto"
    );
  });

  it("in automatico sopra soglia assegna il reparto", () => {
    const applied = autoAppliedChoice(
      {
        category: "pezzo_mancante",
        urgency: "alta",
        summary: "Manca il modulo intermedio.",
        product: "Scala",
        orderNumber: "4412",
        partCodes: ["SC-INT-90"],
        suggestedAction: "Spedire il modulo.",
        confidence: 0.9,
        department: "logistica",
      },
      "aperto",
      { telephonyAutoRoute: true }
    );
    assert.equal(applied?.status, "assegnato");
    assert.equal(applied?.choice.department, "logistica");
    assert.equal(applied?.choice.automatic, true);
  });

  it("spento o sotto soglia non instrada da solo", () => {
    const proposal = {
      category: "pezzo_mancante" as const,
      urgency: "normale" as const,
      summary: "Manca il modulo intermedio.",
      product: null,
      orderNumber: null,
      partCodes: [],
      suggestedAction: "Verificare.",
      confidence: 0.9,
      department: "logistica" as const,
    };
    assert.equal(autoAppliedChoice(proposal, "aperto", {}), null);
    assert.equal(
      autoAppliedChoice(proposal, "aperto", {
        telephonyAutoRoute: true,
        telephonyConfidence: 0.95,
      }),
      null
    );
  });
});
