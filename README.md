# LINEUP'GO — CS2 Utility Lineups

App web locale (Vanilla HTML/CSS/JS) per consultare rapidamente le lineups delle utilities in CS2 mentre sei in game. Nessun framework, nessun build step: apri e usi.

## Avvio

Il browser blocca il caricamento di file locali via `file://`, quindi va servito un piccolo server HTTP. Dalla cartella del progetto:

```bash
# Opzione A: Python
python3 -m http.server 8000

# Opzione B: Node
npx serve .
```

Poi apri nel browser: **http://localhost:8000**

## Come si usa

1. **Scelta mappa** — clicchi la mappa che ti serve (per ora solo Mirage).
2. **Minimappa** — vedi i pin. Ogni lineup ha la propria posizione sulla mappa (scelta all'inserimento); i pin vicini vengono raggruppati in uno solo. Un filtro in alto (Tutte / Smoke / Flash) mostra solo i tipi scelti. Clicchi il pin.

   La minimappa è **zoommabile**:
   - **Rotellina del mouse** per zoomare (intorno al cursore)
   - **Trascina** con il mouse per muovere/spostare la vista
   - **Pinch con due dita** su schermi touch
   - Pulsanti **+ / − / reset** in alto a destra
3. **Posizione di partenza** — se più lineups puntano allo stesso posto da posizioni diverse, scegli da dove lanciare.
4. **Dettaglio** — due foto affiancate: **posizione di partenza** (dove stare) e **dove mirare**. Il tipo di utility compare come icona in basso a sinistra sulla foto di partenza, il metodo di lancio (es. Throw, Jump Throw, W+Jump Throw…) come chip in basso a destra sulla foto "Dove mirare". In alto a destra ci sono i pulsanti **Modifica** / **Elimina** (stesso modulo precompilato per modifica).

## Struttura file

```
├── index.html
├── css/style.css
├── data/
│   ├── data.js        ← database lineup LOCALE (non versionato, aggiunto a .gitignore)
│   └── data.template.js ← base vuota versionata; copialo in data.js per iniziare
├── js/
│   ├── map.js         ← rendering minimappa + pin + pannello
│   ├── app.js         ← navigazione tra schermate + filtro
│   └── add-lineup.js  ← form "Aggiungi lineup" (salva su data/data.js)
└── assets/
    └── mirage/
        ├── minimap.png            ← radar di Mirage (file da caricare)
        └── lineups/               ← foto lineup (LOCALI, non versionate)
            ├── smokes/<nome>/<nome>.png, <nome>_aim.png
            ├── flashes/<nome>/<nome>.png, <nome>_aim.png
            ├── molotovs/<nome>/<nome>.png, <nome>_aim.png
            └── hes/<nome>/<nome>.png, <nome>_aim.png
```

> **Nota git**: le foto in `assets/*/lineups/` e il file `data/data.js` sono **locali** e non versionati (sono aggiunti a `.gitignore`). Al primo avvio su un clone pulito l&apos;app parte col database vuoto: per iniziare ad aggiungere mappe/lineup copia `data/data.template.js` → `data/data.js`. Il tuo `data/data.js` locale non verrà mai sovrascritto da git.

## Aggiungere una nuova lineup

### Dal browser
All&apos;avvio appare il pannello **&quot;Configura salvataggio lineup&quot;** che ti guida a concedere i permessi: prima scegli la **cartella del progetto** (quella che contiene `data/data.js`), poi il file **`data/data.js`**. Il pannello valida le scelte (se prendi un&apos;altra cartella o un altro file, ti avvisa). Con il pulsante **&quot;Reset permessi&quot;** puoi togliere le autorizzazioni e ripartire.

Poi clicca il pulsante **"+ Aggiungi lineup"** (presente nella schermata mappe e in quella della mappa, mai nel dettaglio). Compila il form (mappa, tipo utility, lato, nome, posizione, lancio), **clicca un punto sulla mini-mappa** per piazzare la posizione della lineup, e seleziona le due foto. Le foto vengono copiate automaticamente in `assets/<mappa>/lineups/<tipo>s/<nome>/` e la lineup viene aggiunta a `data/data.js`. Il salvataggio automatico richiede un browser basato su Chromium e di avviare il server HTTP (non `file://`); senza server, la lineup viene solo copiata negli appunti da incollare in `data/data.js`. La *consultazione* dell'app funziona invece anche aprendo `index.html` direttamente da `file://`.

### A mano
Apri `data/data.js` e aggiungi un oggetto dentro l&apos;array `lineups` della mappa desiderata. Esempio:

```js
{
  id: "3c8e1a9b2f47",
  util: "smoke",
  name: "Window smoke da Catwalk",
  start: "Catwalk",
  throw: "Throw",
  x: 0.545,
  y: 0.315,
  imgStart: "assets/mirage/lineups/smokes/window/catwalk.png",
  imgAim: "assets/mirage/lineups/smokes/window/catwalk_aim.png"
}
```

Poi metti le due foto nel percorso indicato. Niente altro serve: la UI lo mostra da sola e raggruppa i pin vicini. Il campo `id` (8 caratteri esadecimali univoci) serve all&apos;app per modificare/eliminare la lineup.

## Aggiungere una mappa

1. Crea la cartella `assets/<mappa>/` e salva lì la minimappa.
2. In `data/data.js` aggiungi un nodo dentro `DATABASE.maps` con:
   - `id`, `name`
   - `minimap` / `thumb` → percorso della minimappa
   - `lineups` → le relative lineups (ognuna con le proprie coordinate `x`/`y`)

## Mappe e immagini

- **Minimap di Mirage**: salva il radar in `assets/mirage/minimap.png`. Le coordinate di ogni lineup (`x`/`y`) sono in percentuale, quindi restano valide a prescindere dalla risoluzione/immagine (finché è un radar top-down della mappa).
- **Foto lineup**: una per la posizione di partenza (`<nome>.png`) e una per il punto di mira (`<nome>_aim.png`).
