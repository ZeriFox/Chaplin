# Manuale Gestione Prezzi Dinamici - AL 22 Suite & SPA

## Indice
1. [Introduzione](#introduzione)
2. [Concetti Fondamentali](#concetti-fondamentali)
3. [Come Funziona il Sistema](#come-funziona-il-sistema)
4. [Guida Passo-Passo](#guida-passo-passo)
5. [Esempi Pratici](#esempi-pratici)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Introduzione

Il sistema di **Prezzi Dinamici** di AL 22 Suite & SPA ti permette di gestire automaticamente i prezzi delle tue camere in base a:
- **Stagioni** (bassa, media, alta, super-alta)
- **Eventi e Festività** (Ferragosto, Natale, Red Bull Cliff Diving, etc.)
- **Periodi Personalizzati** (promozioni speciali, eventi locali)
- **Override Manuali** (per casi specifici)

Tutto in modo automatico e con un calendario visivo per vedere immediatamente i prezzi di ogni giorno!

---

## Concetti Fondamentali

### 1. Prezzo Base
Il **prezzo base** è il punto di partenza per ogni camera:
- **Camera Familiare con Balcone**: €150/notte (esempio)
- **Camera Matrimoniale con Vasca Idromassaggio**: €180/notte (esempio)

Questo prezzo viene poi moltiplicato in base alla stagione o periodo speciale.

### 2. Moltiplicatore
Il **moltiplicatore** è un numero che modifica il prezzo base:
- `1.0` = Prezzo base (nessun cambiamento)
- `1.5` = +50% sul prezzo base
- `2.0` = +100% sul prezzo base (il doppio)
- `0.7` = -30% sul prezzo base (sconto)

**Esempio:**
- Prezzo base: €150
- Moltiplicatore stagione alta: 1.5
- **Prezzo finale: €225** (150 × 1.5)

### 3. Gerarchia dei Prezzi
Il sistema applica i prezzi con questa priorità (dal più importante al meno importante):

1. **Override Manuale** (hai impostato un prezzo fisso per quel giorno)
2. **Periodo Speciale** (Ferragosto, Natale, eventi)
3. **Stagione** (bassa, media, alta, super-alta)
4. **Prezzo Base** (se nessuna delle precedenti si applica)

---

## Come Funziona il Sistema

### Schema Stagioni per Polignano a Mare

Il file che ti ho fornito contiene uno schema completo delle stagioni già configurate:

\`\`\`
📅 GENNAIO
├─ 1-6 gennaio → Alta (festività Capodanno)
└─ 7-31 gennaio → Bassa

📅 FEBBRAIO
├─ 1-28 febbraio → Bassa
└─ Carnevale → Media

📅 MARZO
├─ 1-15 marzo → Media
└─ 15-31 marzo → Medio-Alta

📅 APRILE
├─ Pasqua → Alta
├─ Ponte 25 aprile → Medio-Alta
└─ Resto → Media

📅 MAGGIO
└─ Tutto il mese → Medio-Alta

📅 GIUGNO
├─ 1-15 giugno → Alta
└─ 15-30 giugno → Molto Alta

📅 LUGLIO
├─ Tutto luglio → Alta / Molto Alta
├─ Weekend → Super Alta
└─ Eventi estivi → Super Alta

📅 AGOSTO
├─ 1-9 agosto → Molto Alta
├─ 10-20 agosto → Super Alta (Ferragosto)
└─ 21-31 agosto → Molto Alta

📅 SETTEMBRE
├─ 1-20 settembre → Medio-Alta
└─ 20-30 settembre → Media

📅 OTTOBRE
├─ 1-15 ottobre → Media
└─ 16-31 ottobre → Bassa

📅 NOVEMBRE
└─ Tutto novembre → Bassa

📅 DICEMBRE
├─ 1-5 dicembre → Bassa
├─ 6-9 dicembre → Alta (Immacolata)
├─ 10-20 dicembre → Bassa
└─ 21-31 dicembre → Alta / Super Alta (Natale-Capodanno)
\`\`\`

### Moltiplicatori Consigliati

- **Stagione Bassa**: 0.7 - 0.8 (-20% / -30%)
- **Stagione Media**: 1.0 (prezzo base)
- **Stagione Medio-Alta**: 1.2 - 1.3 (+20% / +30%)
- **Stagione Alta**: 1.5 - 1.7 (+50% / +70%)
- **Stagione Super-Alta**: 2.0 - 2.5 (+100% / +150%)

---

## Guida Passo-Passo

### Accesso alla Sezione Prezzi Dinamici

1. Accedi al **Pannello Admin** (solo per amministratori)
2. Clicca sulla tab **"Prezzi"** (icona €)
3. Vedrai 4 sotto-sezioni:
   - **Calendario Prezzi** - Visualizza i prezzi giorno per giorno
   - **Prezzi Base** - Modifica i prezzi base delle camere
   - **Stagioni** - Configura le fasce stagionali
   - **Periodi Speciali** - Aggiungi eventi e festività

### 1. Impostare i Prezzi Base

**Cosa sono:** I prezzi base sono il punto di partenza prima dei moltiplicatori.

**Come fare:**
1. Vai alla tab **"Prezzi Base"**
2. Troverai le due camere:
   - Camera Familiare con Balcone
   - Camera Matrimoniale con Vasca Idromassaggio
3. Inserisci il prezzo base per notte (es: €150)
4. Clicca **"Aggiorna Prezzo Base"**

**Quando modificare:**
- All'inizio di ogni anno
- Quando vuoi riposizionare i prezzi
- Dopo aver analizzato la concorrenza

### 2. Creare le Stagioni

**Cosa sono:** Le stagioni dividono l'anno in periodi con prezzi simili (bassa, media, alta, super-alta).

**Come fare:**
1. Vai alla tab **"Stagioni"**
2. Clicca su **"+ Aggiungi Stagione"**
3. Compila il form:
   - **Nome**: "Estate Alta Stagione"
   - **Tipologia**: Seleziona "Stagione Alta"
   - **Data Inizio**: 15/06/2025
   - **Data Fine**: 31/07/2025
   - **Moltiplicatore**: 1.5 (per +50%)
   - **Descrizione**: "Giugno-Luglio - Alta richiesta"
4. Clicca **"Crea Stagione"**

**Esempio Pratico:**

Per configurare Agosto (Ferragosto), crea:

**Stagione 1: Agosto Inizio**
- Nome: "Agosto Pre-Ferragosto"
- Tipo: Alta
- Periodo: 01/08/2025 - 09/08/2025
- Moltiplicatore: 1.7 (+70%)

**Stagione 2: Ferragosto**
- Nome: "Ferragosto"
- Tipo: Super-Alta
- Periodo: 10/08/2025 - 20/08/2025
- Moltiplicatore: 2.5 (+150%)

**Stagione 3: Agosto Fine**
- Nome: "Agosto Post-Ferragosto"
- Tipo: Alta
- Periodo: 21/08/2025 - 31/08/2025
- Moltiplicatore: 1.7 (+70%)

### 3. Aggiungere Periodi Speciali

**Cosa sono:** Eventi, festività e momenti particolari che hanno priorità sulle stagioni.

**Come fare:**
1. Vai alla tab **"Periodi Speciali"**
2. Clicca su **"+ Aggiungi Periodo"**
3. Compila il form:
   - **Nome**: "Red Bull Cliff Diving 2025"
   - **Data Inizio**: 25/07/2025
   - **Data Fine**: 27/07/2025
   - **Moltiplicatore**: 2.2 (+120%)
   - **Descrizione**: "Evento Red Bull - Massima affluenza"
4. Clicca **"Crea Periodo Speciale"**

**Eventi Importanti da Configurare:**

1. **Capodanno**
   - 31/12 - 02/01
   - Moltiplicatore: 2.5

2. **Immacolata**
   - 06/12 - 09/12
   - Moltiplicatore: 1.5

3. **Natale**
   - 23/12 - 26/12
   - Moltiplicatore: 2.0

4. **Pasqua** (varia ogni anno)
   - 3 giorni prima e dopo Pasqua
   - Moltiplicatore: 1.8

5. **Ponti**
   - 25 Aprile (3 giorni)
   - 1 Maggio (3 giorni)
   - 2 Giugno (3 giorni)
   - Moltiplicatore: 1.4

6. **Red Bull Cliff Diving**
   - Generalmente fine luglio
   - Moltiplicatore: 2.2

7. **Festival Modugno**
   - Generalmente luglio
   - Moltiplicatore: 1.6

### 4. Visualizzare il Calendario Prezzi

**Come fare:**
1. Vai alla tab **"Calendario Prezzi"**
2. Seleziona la camera dal menu a tendina
3. Usa le frecce per navigare tra i mesi
4. Vedrai una griglia con:
   - Ogni giorno colorato in base alla categoria di prezzo
   - Il prezzo specifico per quel giorno

**Legenda Colori:**
- 🔵 Blu = Bassa Stagione
- 🟢 Verde = Media Stagione
- 🟡 Giallo = Medio-Alta Stagione
- 🟠 Arancione = Alta Stagione
- 🔴 Rosso = Super-Alta Stagione

---

## Esempi Pratici

### Esempio 1: Configurare l'Estate Completa

**Obiettivo:** Prezzi progressivi per l'estate, con picco ad Agosto.

**Passaggi:**

1. **Imposta il prezzo base:**
   - Camera con Balcone: €150
   - Camera con Vasca: €180

2. **Crea le stagioni:**

   **Maggio (Preparazione Estate)**
   - Periodo: 01/05 - 31/05
   - Moltiplicatore: 1.2
   - Risultato: €180 e €216

   **Giugno (Estate Inizia)**
   - Periodo: 01/06 - 30/06
   - Moltiplicatore: 1.5
   - Risultato: €225 e €270

   **Luglio (Piena Estate)**
   - Periodo: 01/07 - 31/07
   - Moltiplicatore: 1.7
   - Risultato: €255 e €306

   **Agosto (Picco)**
   - Periodo: 01/08 - 31/08
   - Moltiplicatore: 2.0
   - Risultato: €300 e €360

3. **Aggiungi il periodo speciale Ferragosto:**
   - Periodo: 10/08 - 20/08
   - Moltiplicatore: 2.5
   - Risultato: €375 e €450 (sovrascrive agosto normale)

### Esempio 2: Promozione Stagione Bassa

**Obiettivo:** Attirare clienti a Gennaio con sconti.

**Passaggi:**

1. **Crea stagione con sconto:**
   - Nome: "Promo Inverno"
   - Periodo: 07/01 - 28/02
   - Moltiplicatore: 0.7 (-30%)
   - Con prezzo base €150 → €105

2. **Aggiungi periodo speciale per San Valentino:**
   - Periodo: 13/02 - 15/02
   - Moltiplicatore: 1.2 (+20%)
   - Risultato: €180 (sovrascrive la promo)

### Esempio 3: Weekend Matrimoni

**Obiettivo:** Prezzi maggiorati per i weekend di Giugno e Settembre (matrimoni).

**Passaggi:**

1. **Identifica i weekend:**
   - 7-8 Giugno
   - 14-15 Giugno
   - 21-22 Giugno
   - 28-29 Giugno

2. **Crea periodi speciali:**
   - Per ogni weekend:
     - Nome: "Weekend Matrimoni Giugno"
     - Moltiplicatore: 1.8
     - Risultato: Prezzo maggiorato del 80%

---

## Best Practices

### 1. Pianificazione Annuale

**Cosa fare:**
- A Gennaio, configura tutte le stagioni per l'anno
- Inserisci subito le festività conosciute
- Lascia flessibilità per eventi dell'ultimo minuto

### 2. Monitoraggio Competitor

**Cosa fare:**
- Controlla i prezzi di B&B simili a Polignano
- Confronta le tue tariffe con Booking.com e Airbnb
- Aggiusta i moltiplicatori se necessario

### 3. Analisi Storica

**Cosa fare:**
- Dopo ogni stagione, analizza:
  - Quali periodi hanno avuto più prenotazioni
  - Quali prezzi hanno funzionato
  - Dove hai perso opportunità
- Usa questi dati per l'anno successivo

### 4. Flessibilità

**Non essere rigido:**
- Se un periodo ha poche prenotazioni, aggiungi una promo
- Se c'è alta richiesta last-minute, aumenta i prezzi
- Monitora costantemente il calendario

### 5. Comunicazione

**Cosa fare:**
- Quando cambi i prezzi base, comunica ai canali (Beds24)
- Avvisa in anticipo per promozioni speciali
- Tieni traccia delle modifiche

---

## Troubleshooting

### Problema: I prezzi non si aggiornano sul sito

**Soluzione:**
1. Controlla che la stagione/periodo sia attivo
2. Verifica le date (formato corretto)
3. Ricarica la pagina del calendario prezzi
4. Controlla la console del browser per errori

### Problema: Prezzi troppo bassi/alti

**Soluzione:**
1. Verifica il moltiplicatore impostato
2. Controlla che non ci siano periodi speciali sovrapposti
3. Verifica il prezzo base della camera

### Problema: Un giorno specifico ha il prezzo sbagliato

**Soluzione:**
1. Controlla se c'è un override manuale
2. Verifica se ci sono periodi speciali che si sovrappongono
3. Controlla le date di inizio/fine delle stagioni

### Problema: Voglio cambiare il prezzo di un giorno specifico

**Soluzione:**
- Usa un **Override Manuale** (funzionalità da implementare)
- Oppure crea un periodo speciale di 1 giorno

---

## Formule di Calcolo

### Calcolo Prezzo Finale

\`\`\`
Prezzo Finale = Prezzo Base × Moltiplicatore
\`\`\`

**Esempi:**
- €150 × 1.0 = €150 (nessun cambiamento)
- €150 × 1.5 = €225 (+50%)
- €150 × 2.0 = €300 (+100%)
- €150 × 0.7 = €105 (-30%)

### Calcolo Prezzo Totale Prenotazione

\`\`\`
Prezzo Totale = Σ (Prezzo di ogni notte)
\`\`\`

**Esempio:**
Prenotazione dal 10/08 al 15/08 (5 notti)
- 10/08: €375 (Ferragosto)
- 11/08: €375 (Ferragosto)
- 12/08: €375 (Ferragosto)
- 13/08: €375 (Ferragosto)
- 14/08: €375 (Ferragosto)
- **Totale: €1,875**

### Calcolo Percentuale di Aumento

\`\`\`
Percentuale = (Moltiplicatore - 1) × 100
\`\`\`

**Esempi:**
- Moltiplicatore 1.5 → +50%
- Moltiplicatore 2.0 → +100%
- Moltiplicatore 0.7 → -30%

---

## File Tecnici Collegati

### Database (Firestore)

Il sistema usa 3 collezioni:

1. **`pricing_seasons`** - Stagioni
   \`\`\`
   {
     id: "auto-generato",
     name: "Estate Alta Stagione",
     type: "alta",
     startDate: "2025-06-15",
     endDate: "2025-07-31",
     priceMultiplier: 1.5,
     description: "Giugno-Luglio alta richiesta",
     createdAt: timestamp,
     updatedAt: timestamp
   }
   \`\`\`

2. **`pricing_special_periods`** - Periodi Speciali
   \`\`\`
   {
     id: "auto-generato",
     name: "Ferragosto 2025",
     startDate: "2025-08-10",
     endDate: "2025-08-20",
     priceMultiplier: 2.5,
     description: "Picco Ferragosto",
     priority: 1,
     createdAt: timestamp,
     updatedAt: timestamp
   }
   \`\`\`

3. **`pricing_overrides`** - Override Manuali
   \`\`\`
   {
     id: "auto-generato",
     roomId: "2",
     date: "2025-08-15",
     price: 450,
     reason: "Prenotazione speciale",
     createdAt: timestamp,
     updatedAt: timestamp
   }
   \`\`\`

### API Endpoints

- `GET /api/pricing/rooms` - Recupera camere e prezzi base
- `GET /api/pricing/seasons` - Recupera stagioni
- `POST /api/pricing/seasons` - Crea nuova stagione
- `GET /api/pricing/special-periods` - Recupera periodi speciali
- `POST /api/pricing/special-periods` - Crea nuovo periodo speciale
- `POST /api/pricing/calculate-dynamic-price` - Calcola prezzo per date specifiche
- `POST /api/pricing/update-base-price` - Aggiorna prezzo base camera

### Componenti React

- `components/dynamic-pricing-management.tsx` - Componente principale
- `app/admin/page.tsx` - Integrazione nel pannello admin

---

## Supporto

Per qualsiasi problema o domanda:
- Consulta questo manuale
- Controlla la console del browser per errori
- Contatta il supporto tecnico con screenshot del problema

---

**Ultima modifica:** 20 Novembre 2025  
**Versione:** 1.0
