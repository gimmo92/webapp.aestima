"use client";

import { useEffect, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";

export function TicketFieldLabelSettings() {
  const { ticketFieldLabels, setTicketFieldLabels } = useInbox();
  const [machineModel, setMachineModel] = useState(ticketFieldLabels.machineModel);
  const [machineSerial, setMachineSerial] = useState(ticketFieldLabels.machineSerial);

  useEffect(() => {
    setMachineModel(ticketFieldLabels.machineModel);
    setMachineSerial(ticketFieldLabels.machineSerial);
  }, [ticketFieldLabels]);

  return (
    <section className="mx-auto max-w-3xl px-5 pt-8 sm:px-8">
      <div className="rounded-2xl border border-border bg-surface/40 p-4">
        <h2 className="text-sm font-semibold text-ink">Nomi dei campi</h2>
        <p className="mt-1 max-w-xl text-xs text-ink-muted">
          Cambiano solo le etichette in lista, coda, dettaglio e nuovo ticket.
          I dati restano gli stessi. Vuoto torna a Macchina e Matricola. Per la
          demo anticaduta: Prodotto e Commessa / Ordine.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-ink-muted">
            Al posto di Macchina
            <input
              value={machineModel}
              onChange={(event) => setMachineModel(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Al posto di Matricola
            <input
              value={machineSerial}
              onChange={(event) => setMachineSerial(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setTicketFieldLabels({ machineModel, machineSerial })}
          className="mt-3 rounded-lg border border-border bg-base px-3 py-2 text-xs font-semibold text-ink hover:border-brand"
        >
          Salva nomi
        </button>
      </div>
    </section>
  );
}
