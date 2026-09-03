# LINEUP'GO — CS2 Utility Lineups

App web locale per consultare rapidamente le lineups delle utility in CS2 durante una partita. Scritta in Vanilla HTML/CSS/JS senza framework, build step o package manager: apri il browser e funziona.

## Funzionalita

- **Selezione mappa** — griglia delle mappe disponibili con anteprima
- **Minimappa interattiva** — pin posizionati sulle coordinate reali della lineup, con zoom (rotellina, pinch, pulsanti), pan e raggruppamento automatico dei pin vicini
- **Filtri** — per tipo di utility (Smoke / Flash / Molotov / HE) e per lato (CT / T), indipendenti
- **Dettaglio lineup** — foto affiancate (posizione di partenza e punto di mira) con chip per tipo utility e tipo lancio
- **Aggiungi / Modifica / Elimina lineup** — form integrato che salva direttamente nei file del progetto tramite File System Access API (Chromium). In assenza di server HTTP copia il codice negli appunti
- **Setup permessi** — pannello all'avvio che guida nella concessione dei permessi di scrittura su cartella progetto e file `data.js`

## Installazione

Clone del repository:

scarica direttamente il progetto da Github ed esegui index.html

