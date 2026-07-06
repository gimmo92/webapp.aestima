# aestima — Demo

> Un agente AI che trasforma una **richiesta di ricambio in linguaggio naturale** in un **preventivo pronto**.
> Prototipo per **demo commerciali** (non è il prodotto di produzione).

Design **dark, professionale, industriale**. Costruito con **Next.js 15 (App Router) + TypeScript + Tailwind CSS**, pronto per il deploy su **Vercel**.

> **L'approvazione finale resta al tecnico** / **aestima prepara, l'operatore approva e invia.** Nessun invio automatico.

## Due viste della demo

| Rotta | Cosa mostra |
| --- | --- |
| **`/`** | **Dashboard "unibox"** (schermata di default) — inbox unificata delle richieste ricambi after-sales, con stati, etichette e analisi dell'agente per ogni email. |
| **`/demo`** | **Demo flusso** — dalla singola richiesta al preventivo, in 4 step guidati. |

Le due viste sono collegate tra loro (link in alto a destra).

---

## Dashboard inbox (schermata di default, `/`)

Layout a **tre colonne**, in stile inbox unificata (ispirato a Instantly) ma per il dominio after-sales/ricambi:

- **Sinistra — Stati & labeling.** Gli 8 stati della richiesta (_Nuova, Da identificare, Identificata, Preventivo pronto, Inviata al cliente, In attesa fornitore, Chiusa/Vinta, Persa_) con contatore e colore, cliccabili per filtrare. Sotto: filtro per **etichette custom** e casella di **ricerca**.
- **Centro — Lista richieste.** Elenco stile email (cliente, oggetto, anteprima, data, indicatore di stato, etichette) con tab **Primarie / Altre**.
- **Destra — Dettaglio + agente.** Email originale, dropdown per **cambiare stato**, pulsanti **Sposta / Etichetta / Altro**, la sezione **"Analisi aestima"** (ricambio identificato, disponibilità, prezzo; se il pezzo manca → **bozza richiesta fornitore**) e una **bozza di risposta al cliente** in stato _da approvare_ con **"Approva e invia"** (azione dell'operatore).

**Labeling** (cuore della dashboard): assegnare/cambiare stato, applicare **più etichette**, **crearne di nuove** al volo; i contatori si aggiornano in tempo reale.

> **Stato in memoria (React state), niente `localStorage` né DB.** In produzione la lista si popolerebbe dalla **casella email reale** del cliente (IMAP / API del provider) e stato + etichette verrebbero **persistiti su database**. Qui è tutto mock per la demo (vedi commenti in `app/page.tsx` e `lib/inboxData.ts`).

---

## Il flusso (una schermata, 4 step)

1. **Richiesta del cliente** — si incolla/scrive una richiesta di ricambio vaga, in linguaggio naturale (esempio precompilato modificabile) + allegato foto simulato.
2. **Elaborazione dell'agente** — animazione con gli step: _Interpreto la richiesta → Identifico la macchina → Cerco nella distinta → Identifico il componente → Calcolo il prezzo_. In parallelo gira la vera chiamata a `/api/analyze`.
3. **Ricambio identificato** — macchina riconosciuta, componente con codice ricambio (dalla distinta mock) e disponibilità a magazzino simulata.
4. **Preventivo generato** — offerta su "carta intestata" (logo placeholder, dati fittizi, righe, totale, ricarico urgenza) con pulsanti **Approva** ed **Esporta PDF**.

---

## Come funziona l'analisi (vera, con fallback)

La route server-side `POST /api/analyze`:

- Se è impostata la variabile d'ambiente **`ANTHROPIC_API_KEY`**, invia la richiesta cliente all'**API Anthropic (Claude)** con un system prompt che chiede di estrarre `{ macchina, numero_serie, componente_identificato, urgenza, note }` come **JSON strutturato**.
- Se la chiave **non è presente** (o la chiamata fallisce), usa un **fallback a dati mock** con un'estrazione euristica locale — così **la demo funziona sempre**.

La chiave **non è mai hardcodata**: va impostata come variabile d'ambiente.

---

## Installazione (locale)

Requisiti: **Node.js 18.18+** (consigliato 20+).

```bash
# 1. Installa le dipendenze
npm install

# 2. (Opzionale) configura la chiave API
cp .env.example .env.local
#   poi apri .env.local e incolla la tua chiave in ANTHROPIC_API_KEY

# 3. Avvia in sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Senza chiave API la demo gira comunque (modalità mock). Con la chiave, l'analisi usa davvero Claude.

---

## Impostare `ANTHROPIC_API_KEY`

### In locale

Crea un file **`.env.local`** nella root del progetto:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
# opzionale, per scegliere il modello:
ANTHROPIC_MODEL=claude-sonnet-4-5
```

Ottieni la chiave dalla [console Anthropic](https://console.anthropic.com/).
Non committare mai `.env.local` (è già in `.gitignore`).

### Su Vercel

1. Vai nel progetto → **Settings → Environment Variables**.
2. Aggiungi:
   - `ANTHROPIC_API_KEY` = la tua chiave
   - (opzionale) `ANTHROPIC_MODEL` = `claude-sonnet-4-5`
3. Seleziona gli ambienti (Production / Preview / Development) e salva.
4. Ridistribuisci (**Redeploy**) per applicare le variabili.

---

## Deploy su Vercel

Nessuna configurazione esotica: è un progetto Next.js standard.

**Opzione A — dall'interfaccia Vercel (consigliata)**

1. Pusha il progetto su un repo Git (GitHub/GitLab/Bitbucket).
2. Su [vercel.com](https://vercel.com) → **Add New… → Project** → importa il repo.
3. Framework rilevato automaticamente: **Next.js**. Lascia le impostazioni di default.
4. Aggiungi la variabile `ANTHROPIC_API_KEY` (vedi sopra) — opzionale.
5. **Deploy**.

**Opzione B — da CLI**

```bash
npm i -g vercel
vercel            # primo deploy (preview)
vercel --prod     # deploy in produzione
```

---

## Struttura del progetto

```
.
├── app/
│   ├── api/analyze/route.ts     # Route server-side: Anthropic + fallback mock
│   ├── globals.css              # Tema dark/industriale (Tailwind v4) + stili di stampa
│   ├── layout.tsx               # Layout root, font Inter, metadata
│   ├── page.tsx                 # Default: dashboard "unibox" (stato in memoria + 3 colonne)
│   └── demo/page.tsx            # Demo flusso: orchestrazione dei 4 step
├── components/
│   ├── Header.tsx               # Barra superiore (demo flusso) con link alla dashboard
│   ├── Logo.tsx                 # Logo aestima placeholder (SVG)
│   ├── Stepper.tsx              # Indicatore di avanzamento
│   ├── RequestInput.tsx         # Step 1 — input richiesta + allegato simulato
│   ├── ProcessingAnimation.tsx  # Step 2 — animazione agente
│   ├── PartIdentified.tsx       # Step 3 — ricambio identificato
│   ├── QuoteDocument.tsx        # Step 4 — preventivo su carta intestata
│   ├── HumanNote.tsx            # Messaggio ricorrente "approva il tecnico"
│   └── inbox/
│       ├── InboxTopBar.tsx      # Barra superiore della dashboard
│       ├── StatusSidebar.tsx    # Colonna sx — stati, etichette, ricerca
│       ├── RequestList.tsx      # Colonna centro — lista richieste + tab
│       ├── RequestDetail.tsx    # Colonna dx — dettaglio, stato, etichette
│       ├── AgentPanel.tsx       # Analisi aestima + bozze (cliente/fornitore)
│       ├── StatusPill.tsx       # Badge/dot di stato (colori inline)
│       └── LabelChip.tsx        # Chip etichetta custom
├── lib/
│   ├── types.ts                 # Tipi condivisi (flusso/preventivo)
│   ├── mockData.ts              # Dati di esempio: macchine + distinte (BOM)
│   ├── match.ts                 # Match analisi → dati distinta
│   ├── mockAnalyze.ts           # Estrazione euristica locale (fallback)
│   ├── quote.ts                 # Generatore del preventivo
│   ├── inboxTypes.ts            # Tipi dashboard (stati, etichette, richieste)
│   ├── inboxData.ts             # Mock: stati, etichette, 8 richieste email
│   └── inboxDrafts.ts           # Bozze risposta cliente / richiesta fornitore
├── .env.example
├── next.config.ts
├── tailwind (via @tailwindcss/postcss)
└── package.json
```

---

## Personalizzare i dati mock

Tutti i dati di esempio sono in **`lib/mockData.ts`**, commentati e facili da sostituire:

- **Macchine** con `serial` (matricola), `model`, `year`, `category`.
- **Distinta base (`bom`)**: per ogni componente `code`, `description`, `keywords` (sinonimi con cui il cliente potrebbe descriverlo), `listPrice`, `stock` (giacenza), `leadTimeDays`.
- **`SAMPLE_REQUEST`**: la richiesta precompilata.
- **`COMPANY`**: i dati fittizi della carta intestata.

Il matcher (`lib/match.ts`) collega il linguaggio naturale del cliente al componente giusto usando le `keywords`.

Le richieste della dashboard sono in **`lib/inboxData.ts`** (8 email di esempio, gli 8 `STATUSES` con colori, e le `DEFAULT_LABELS`), anch'esse commentate e facili da sostituire. Le email referenziano le matricole di `mockData.ts` così l'agente riesce a identificarle.

---

## Note

- Mobile-responsive, ma pensata per essere mostrata su **desktop/proiettore** in demo.
- **Esporta PDF** usa il dialog di stampa del browser (Salva come PDF), mostrando solo il documento del preventivo.
- Dati, azienda e prezzi sono **fittizi**, a solo scopo dimostrativo.
