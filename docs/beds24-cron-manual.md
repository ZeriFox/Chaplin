/**
 * ============================================================================
 * MANUALE COMPLETO – INTEGRAZIONE BEDS24 + CRON + EMAIL DI ALLERTA
 * Progetto: al22suite.com
 * ============================================================================
 *
 * OBIETTIVO
 * ----------------------------------------------------------------------------
 * Gestire in modo AUTOMATICO e SICURO i token di Beds24 (read/write) usando:
 * - Read Token (lettura prenotazioni/recensioni, lunga durata ~2 mesi)
 * - Write Token (scrittura/modifica, durata breve ~24h)
 * - Refresh Token (a lunga durata, serve per generare nuovi token)
 * - Due endpoint cron protetti da secret
 * - Firestore come storage centrale dello stato
 * - Resend per inviare email di errore all’amministratore
 *
 * ============================================================================
 * 1. VARIABILI D’AMBIENTE RICHIESTE
 * ============================================================================
 *
 * Da configurare su Vercel (tutti gli ambienti necessari):
 *
 * - BEDS24_API_URL        (opzionale, default: "https://beds24.com/api/v2")
 * - BEDS24_READ_TOKEN     Read token iniziale (long-life token di Beds24)
 * - BEDS24_REFRESH_TOKEN  Refresh token ufficiale di Beds24 (API v2)
 * - BEDS24_PROPERTY_ID    ID della proprietà per recensioni ecc.
 *
 * - RESEND_API_KEY        API key di Resend
 * - RESEND_FROM_EMAIL     Mittente email Resend (es. "noreply@al22suite.com")
 * - ALERT_EMAIL           Email di destinazione per errori cron
 *
 * - CRON_SECRET           Secret usato da cron-job.org/Postman:
 *                         da passare nell’header:
 *                         Authorization: Bearer <CRON_SECRET>
 *
 * ============================================================================
 * 2. STRUTTURA FIRESTORE UTILIZZATA
 * ============================================================================
 *
 * Firestore viene usato per memorizzare lo stato dei token e i meta-dati:
 *
 * Collezione: "system"
 * ----------------------------------------------------------------------------
 *  - Documento: "beds24_tokens"
 *      readToken            → ultimo read token valido (per le letture)
 *      readTokenRefreshedAt → timestamp (ms) dell’ultimo refresh
 *      readTokenExpiresIn   → durata in secondi (dato da Beds24)
 *
 *  - Documento: "beds24_write_token"
 *      accessToken          → ultimo write token valido (per scritture)
 *      expiresAt            → timestamp (ms) di scadenza calcolata
 *
 * (opzionalmente possono esistere anche "beds24_token" o "settings/beds24Token"
 *  come compatibilità/backup, ma non sono necessari al funzionamento base.)
 *
 * Collezione: "settings"
 * ----------------------------------------------------------------------------
 *  - Documento: "beds24Token"
 *      refreshToken         → eventuale copia del refresh token
 *      lastRefreshed        → ISO string dell’ultimo aggiornamento
 *
 * Tutti questi documenti vengono creati/aggiornati automaticamente dalla
 * logica dei cron e del client, non c’è bisogno di gestirli a mano.
 *
 * ============================================================================
 * 3. ENDPOINT CRON – WRITE TOKEN
 *    /api/cron/refresh-beds24-token
 * ============================================================================
 *
 * SCOPO
 * ----------------------------------------------------------------------------
 * Mantenere SEMPRE valido il write token, necessario per:
 * - creare / modificare / cancellare prenotazioni
 * - bloccare/sbloccare date
 * - eventuali altre operazioni di scrittura su Beds24
 *
 * AUTENTICAZIONE
 * ----------------------------------------------------------------------------
 * La route è protetta tramite header:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Nel codice:
 *
 *   const authHeader = request.headers.get("authorization") ?? ""
 *   const cronSecret = process.env.CRON_SECRET ?? ""
 *   const [, token] = authHeader.split(" ")
 *
 *   if (!token || token.trim() !== cronSecret.trim()) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 *   }
 *
 * LOGICA
 * ----------------------------------------------------------------------------
 * 1) Verifica l’Authorization con CRON_SECRET.
 * 2) Chiama `beds24Client.forceRefreshWriteToken()`.
 * 3) Nel client:
 *    - legge l’eventuale refresh token da Firestore o ENV
 *    - chiama Beds24:
 *        GET <BEDS24_API_URL>/authentication/token
 *        Headers: accept: application/json, refreshToken: <refreshToken>
 *    - riceve:
 *        { token, expiresIn }
 *    - calcola expiresAt = now + (expiresIn - 300) * 1000
 *      (5 minuti di margine)
 *    - salva in Firestore nel doc "system/beds24_write_token"
 * 4) Restituisce JSON:
 *    { success: true, message: "Write token refreshed successfully", ... }
 *
 * GESTIONE ERRORI + EMAIL
 * ----------------------------------------------------------------------------
 * In caso di errore:
 * - il catch logga su console
 * - viene inviata una email tramite Resend:
 *
 *   to: process.env.ALERT_EMAIL
 *   subject: "⚠️ Beds24 Write Token Refresh Fallito"
 *   html: dettagli sull’errore + possibili azioni
 *
 * - la response JSON è:
 *   { success: false, error: "<messaggio>", status: 500 }
 *
 * SCHEDULAZIONE CONSIGLIATA
 * ----------------------------------------------------------------------------
 * - Ogni 12 ore (cron-job.org impostato su "every 12 hours").
 *   Esempio: 00:00, 12:00 (Europe/Rome).
 *
 * ============================================================================
 * 4. ENDPOINT CRON – READ TOKEN
 *    /api/cron/refresh-beds24-read-token
 * ============================================================================
 *
 * SCOPO
 * ----------------------------------------------------------------------------
 * Mantenere valido il read token (long-life, ~2 mesi) che serve per:
 * - leggere prenotazioni
 * - leggere recensioni (Booking, Airbnb)
 * - leggere stanze, disponibilità, ecc.
 *
 * AUTENTICAZIONE
 * ----------------------------------------------------------------------------
 * Stesso schema del write cron:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * LOGICA
 * ----------------------------------------------------------------------------
 * 1) Verifica l’Authorization con CRON_SECRET.
 * 2) Recupera il refresh token da ENV:
 *
 *   const storedRefreshToken = process.env.BEDS24_REFRESH_TOKEN
 *
 * 3) Legge da Firestore il documento "system/beds24_tokens":
 *
 *   const tokenDoc = await getDoc(doc(db, "system", "beds24_tokens"))
 *   const lastRefresh = tokenData?.readTokenRefreshedAt || 0
 *   const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24)
 *
 * 4) Se `daysSinceRefresh < 55`:
 *      → il token è ancora valido, nessun refresh:
 *         { success: true, message: "Read token still valid", ... }
 *
 * 5) Se `daysSinceRefresh >= 55`:
 *      → serve un nuovo read token:
 *
 *      GET https://beds24.com/api/v2/authentication/token
 *      Headers:
 *        accept: application/json
 *        refreshToken: <BEDS24_REFRESH_TOKEN>
 *
 *      Beds24 risponde con:
 *        { token, expiresIn }
 *
 *      Il cron salva:
 *        readToken            = data.token
 *        readTokenRefreshedAt = now
 *        readTokenExpiresIn   = data.expiresIn
 *
 *      nel documento "system/beds24_tokens" (merge: true).
 *
 *      Response:
 *        { success: true, message: "Read token refreshed successfully", ... }
 *
 * GESTIONE ERRORI + EMAIL
 * ----------------------------------------------------------------------------
 * In caso di errore (401 "Token not valid", 500 Beds24, ecc.):
 * - logga il problema in console
 * - prova a inviare una email tramite Resend:
 *   to: ALERT_EMAIL
 *   subject: "⚠️ Beds24 Read Token Refresh Fallito"
 *   con:
 *   - errore serializzato
 *   - suggerimenti (controllare BEDS24_REFRESH_TOKEN, rigenerare da Beds24, ecc.)
 * - restituisce JSON:
 *   { success: false, error: "<messaggio>", status: 500 }
 *
 * SCHEDULAZIONE CONSIGLIATA
 * ----------------------------------------------------------------------------
 * - Una volta al giorno, ad esempio alle 03:00 (Europe/Rome).
 *   L’algoritmo interno si occupa comunque di NON fare refresh prima di 55 giorni.
 *
 * ============================================================================
 * 5. COME BEDS24CLIENT USA I TOKEN
 * ============================================================================
 *
 * Il client Beds24 centralizza tutte le chiamate verso l’API v2.
 *
 * LETTURA (GET) – usa il READ TOKEN
 * ----------------------------------------------------------------------------
 * - Per tutte le chiamate GET (getBookings, getReviews, getRooms, ecc.),
 *   la funzione `request()` distingue:
 *
 *     const isReadOperation = method === "GET"
 *
 * - Se è lettura:
 *
 *     token = BEDS24_READ_TOKEN (come fallback iniziale)
 *     oppure token letto da Firestore (documento "system/beds24_tokens")
 *     in base all’implementazione.
 *
 * - L’header inviato a Beds24 è:
 *
 *     headers: {
 *       "Content-Type": "application/json",
 *       token, // <-- read token
 *       ...
 *     }
 *
 * SCRITTURA (POST / PUT / DELETE) – usa il WRITE TOKEN
 * ----------------------------------------------------------------------------
 * - Se il metodo NON è GET:
 *
 *     token = await this.getWriteToken()
 *
 * - `getWriteToken()`:
 *   1. prova a caricare il write token da Firestore ("system/beds24_write_token")
 *   2. se non esiste o è scaduto, chiama `refreshWriteToken()`
 *   3. ritorna sempre un token valido
 *
 * - In caso di 401 da Beds24, `request()` riprova:
 *   1. chiama `refreshWriteToken()`
 *   2. rifà la richiesta con il nuovo token
 *
 * FUNZIONI DI UTILITÀ
 * ----------------------------------------------------------------------------
 * - `forceRefreshToken()`:
 *     chiama manualmente `refreshAccessToken()` (se si usa un token generico)
 *
 * - `forceRefreshWriteToken()`:
 *     chiama `refreshWriteToken()` e salva il nuovo write token in Firestore
 *
 * ============================================================================
 * 6. FLUSSO COMPLETO – COSA SUCCEDE NEL QUOTIDIANO
 * ============================================================================
 *
 * 1) L’utente (o cron-job.org) chiama:
 *      - /api/cron/refresh-beds24-token        → ogni 12 ore
 *      - /api/cron/refresh-beds24-read-token   → ogni giorno / ogni tot giorni
 *
 * 2) Entrambe le route verificano l’Authorization tramite CRON_SECRET.
 *
 * 3) Se l’auth è ok:
 *      - il write cron mantiene aggiornato il write token (24h)
 *      - il read cron mantiene aggiornato il read token (2 mesi)
 *
 * 4) I valori aggiornati vengono salvati in Firestore.
 *
 * 5) Il client Beds24, quando fa qualsiasi chiamata:
 *      - per leggere: usa sempre l’ultimo read token valido
 *      - per scrivere: usa sempre l’ultimo write token valido
 *
 * 6) Se qualcosa va storto:
 *      - l’errore viene loggato
 *      - viene inviata un’email automatica a ALERT_EMAIL
 *      - l’applicazione continua a funzionare, ma l’amministratore è avvisato
 *
 * ============================================================================
 * 7. NOTE IMPORTANTI
 * ============================================================================
 *
 * - Non condividere mai pubblicamente:
 *     - BEDS24_READ_TOKEN
 *     - BEDS24_REFRESH_TOKEN
 *     - CRON_SECRET
 *     - chiavi Resend
 *
 * - Dopo aver cambiato una variabile d’ambiente su Vercel, è SEMPRE necessario
 *   un Redeploy dell’applicazione.
 *
 * - Se Beds24 risponde con "Token not valid":
 *     → quasi sempre è un problema di BEDS24_REFRESH_TOKEN sbagliato o rigenerato.
 *       In tal caso va aggiornato su Vercel e ridistribuito il progetto.
 *
 * - Se i cron iniziano a fallire, controllare:
 *     1) CRON_SECRET nella route e in cron-job.org
 *     2) BEDS24_REFRESH_TOKEN su Vercel
 *     3) Eventuali dettagli nelle email di errore inviate da Resend
 *
 * ============================================================================
 * FINE MANUALE
 * ============================================================================
 */
