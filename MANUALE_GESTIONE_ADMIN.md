# Manuale Gestione Cambio Dati Admin

## Indice
1. [Panoramica Sistema](#panoramica-sistema)
2. [File Coinvolti](#file-coinvolti)
3. [Flussi di Lavoro](#flussi-di-lavoro)
4. [Configurazione Richiesta](#configurazione-richiesta)
5. [Sicurezza e Validazione](#sicurezza-e-validazione)
6. [Troubleshooting](#troubleshooting)

---

## Panoramica Sistema

Il sistema di gestione cambio dati admin permette di modificare in sicurezza:
- **Email** (verifica tramite SMS)
- **Password** (verifica tramite Email)
- **Numero di Telefono** (verifica tramite Email)

Ogni modifica richiede una verifica OTP (One-Time Password) con codice a 4 cifre valido per 10 minuti.

### Metodi di Verifica

| Dato da Modificare | Metodo Verifica | Inviato A |
|-------------------|-----------------|-----------|
| Email | SMS (Twilio) | Numero registrato nel DB |
| Password | Email (Resend) | Email registrata nel DB |
| Telefono | Email (Resend) | Email registrata nel DB |

---

## File Coinvolti

### 1. Frontend

#### `components/admin-security-settings.tsx`
**Ruolo**: Interfaccia utente per modificare email, password e telefono

**Responsabilità**:
- Mostra i form di modifica con validazione client-side
- Gestisce l'invio delle richieste OTP
- Mostra i modali di conferma con input OTP
- Invia i dati aggiornati dopo verifica OTP

**Stati Principali**:
\`\`\`tsx
const [email, setEmail] = useState("")           // Nuova email
const [password, setPassword] = useState("")     // Nuova password
const [phone, setPhone] = useState("")           // Nuovo telefono
const [showEmailOTP, setShowEmailOTP] = useState(false)  // Modale OTP email
const [showPasswordOTP, setShowPasswordOTP] = useState(false)  // Modale OTP password
const [showPhoneOTP, setShowPhoneOTP] = useState(false)  // Modale OTP telefono
\`\`\`

**Funzioni Chiave**:
- `handleChangeEmail()`: Valida email e invia richiesta OTP via SMS
- `handleChangePassword()`: Valida password e invia richiesta OTP via Email
- `handleChangePhone()`: Valida telefono e invia richiesta OTP via Email
- `handleVerifyEmailOTP()`: Verifica OTP e aggiorna email
- `handleVerifyPasswordOTP()`: Verifica OTP e aggiorna password
- `handleVerifyPhoneOTP()`: Verifica OTP e aggiorna telefono

**Validazioni**:
\`\`\`tsx
// Email: formato email valido
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password: 8+ caratteri, 1 maiuscola, 1 minuscola, 2 numeri, 3 lettere
const hasUpperCase = /[A-Z]/.test(password)
const hasLowerCase = /[a-z]/.test(password)
const numberCount = (password.match(/\d/g) || []).length >= 2
const letterCount = (password.match(/[a-zA-Z]/g) || []).length >= 3

// Telefono: formato italiano
const phoneRegex = /^(\+39)?[\s]?[0-9]{10}$/
\`\`\`

#### `components/ui/input-otp.tsx`
**Ruolo**: Componente per inserimento codice OTP

**Caratteristiche**:
- 4 slot per le cifre del codice
- Auto-focus e navigazione automatica
- Stile personalizzato con animazioni

---

### 2. Backend - Invio OTP

#### `app/api/admin/send-otp-email/route.ts`
**Ruolo**: Invia OTP via SMS quando l'admin vuole cambiare email

**Flusso**:
1. Riceve `userId` e `newEmail` dalla richiesta
2. Recupera i dati admin da Firestore (`users/${userId}`)
3. Verifica che il numero di telefono sia configurato
4. Genera codice OTP random a 4 cifre
5. Salva OTP in Firestore con scadenza 10 minuti
6. Invia SMS con Twilio al numero registrato
7. Ritorna conferma all'utente

**Documento Firestore**:
\`\`\`typescript
// Collezione: admin_otps
// Documento ID: email_change
{
  userId: string,
  code: string,        // Es: "1234"
  expiresAt: Timestamp, // 10 minuti nel futuro
  newEmail: string     // Email da impostare dopo verifica
}
\`\`\`

**Integrazione Twilio**:
\`\`\`typescript
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

const client = twilio(accountSid, authToken)

await client.messages.create({
  body: `Il tuo codice OTP per cambiare l'email è: ${otpCode}. Valido per 10 minuti.`,
  from: twilioPhone,
  to: adminPhone
})
\`\`\`

#### `app/api/admin/send-otp-password/route.ts`
**Ruolo**: Invia OTP via Email quando l'admin vuole cambiare password

**Flusso**:
1. Riceve `userId` dalla richiesta
2. Recupera email admin da Firestore
3. Genera codice OTP random a 4 cifre
4. Salva OTP in Firestore con scadenza 10 minuti
5. Invia email con Resend all'email registrata
6. Ritorna conferma all'utente

**Documento Firestore**:
\`\`\`typescript
// Collezione: admin_otps
// Documento ID: password_change
{
  userId: string,
  code: string,        // Es: "5678"
  expiresAt: Timestamp
}
\`\`\`

**Integrazione Resend**:
\`\`\`typescript
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: adminEmail,
  subject: 'Codice OTP - Cambio Password',
  html: `
    <h2>Codice OTP per Cambio Password</h2>
    <p>Il tuo codice OTP è: <strong>${otpCode}</strong></p>
    <p>Il codice è valido per 10 minuti.</p>
  `
})
\`\`\`

#### `app/api/admin/send-otp-phone/route.ts`
**Ruolo**: Invia OTP via Email quando l'admin vuole cambiare telefono

**Flusso**: Identico a `send-otp-password` ma salva anche il `newPhone`

**Documento Firestore**:
\`\`\`typescript
// Collezione: admin_otps
// Documento ID: phone_change
{
  userId: string,
  code: string,
  expiresAt: Timestamp,
  newPhone: string     // Telefono da impostare dopo verifica
}
\`\`\`

---

### 3. Backend - Verifica OTP e Aggiornamento

#### `app/api/admin/update-email/route.ts`
**Ruolo**: Verifica OTP e aggiorna email admin

**Flusso**:
1. Riceve `userId` e `otp` dalla richiesta
2. Recupera documento OTP da Firestore (`admin_otps/email_change`)
3. Verifica che:
   - Il documento esista
   - Il codice OTP corrisponda
   - Il codice non sia scaduto (< 10 minuti)
   - Il userId corrisponda
4. Aggiorna email in Firebase Auth
5. Aggiorna email in Firestore (`users/${userId}`)
6. Elimina documento OTP
7. Ritorna successo

**Codice Verifica**:
\`\`\`typescript
const otpDoc = await getDoc(doc(db, 'admin_otps', 'email_change'))
const otpData = otpDoc.data()

// Verifica esistenza
if (!otpDoc.exists() || !otpData) {
  return NextResponse.json({ error: "Codice OTP non valido" }, { status: 400 })
}

// Verifica scadenza
if (otpData.expiresAt.toDate() < new Date()) {
  await deleteDoc(doc(db, 'admin_otps', 'email_change'))
  return NextResponse.json({ error: "Codice OTP scaduto" }, { status: 400 })
}

// Verifica codice
if (otpData.code !== otp) {
  return NextResponse.json({ error: "Codice OTP non valido" }, { status: 400 })
}

// Verifica userId
if (otpData.userId !== userId) {
  return NextResponse.json({ error: "Codice OTP non valido" }, { status: 400 })
}
\`\`\`

**Aggiornamento Dati**:
\`\`\`typescript
// 1. Aggiorna Firebase Auth
await adminAuth.updateUser(userId, { email: otpData.newEmail })

// 2. Aggiorna Firestore
await updateDoc(doc(db, 'users', userId), {
  email: otpData.newEmail,
  updatedAt: serverTimestamp()
})

// 3. Elimina OTP
await deleteDoc(doc(db, 'admin_otps', 'email_change'))
\`\`\`

#### `app/api/admin/update-password/route.ts`
**Ruolo**: Verifica OTP e aggiorna password admin

**Flusso**: Simile a `update-email` ma aggiorna solo la password

**Aggiornamento Password**:
\`\`\`typescript
// 1. Aggiorna Firebase Auth
await adminAuth.updateUser(userId, { password: newPassword })

// 2. Aggiorna Firestore (opzionale, per tracking)
await updateDoc(doc(db, 'users', userId), {
  passwordUpdatedAt: serverTimestamp()
})

// 3. Elimina OTP
await deleteDoc(doc(db, 'admin_otps', 'password_change'))
\`\`\`

#### `app/api/admin/update-phone/route.ts`
**Ruolo**: Verifica OTP e aggiorna telefono admin

**Flusso**: Simile a `update-email` ma aggiorna solo il telefono

---

### 4. Integrazione nella Pagina Admin

#### `app/admin/page.tsx`
**Integrazione**:
\`\`\`tsx
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { AdminSecuritySettings } from '@/components/admin-security-settings'

// Nel tab "Impostazioni"
<Tabs>
  <TabsContent value="impostazioni">
    {/* ... altre sezioni ... */}
    
    <AdminSecuritySettings />
  </TabsContent>
</Tabs>
\`\`\`

---

## Flussi di Lavoro

### Cambio Email

\`\`\`mermaid
sequenceDiagram
    participant U as Admin (UI)
    participant F as Frontend
    participant API1 as send-otp-email
    participant FS as Firestore
    participant T as Twilio (SMS)
    participant API2 as update-email
    participant FA as Firebase Auth

    U->>F: Inserisce nuova email
    F->>F: Valida formato email
    F->>API1: POST /api/admin/send-otp-email
    API1->>FS: Recupera telefono admin
    API1->>API1: Genera OTP 4 cifre
    API1->>FS: Salva OTP (scadenza 10min)
    API1->>T: Invia SMS con OTP
    T-->>U: SMS ricevuto sul telefono
    API1-->>F: Successo
    F->>U: Mostra modale OTP
    U->>F: Inserisce codice OTP
    F->>API2: POST /api/admin/update-email
    API2->>FS: Verifica OTP
    API2->>FA: Aggiorna email
    API2->>FS: Aggiorna documento user
    API2->>FS: Elimina OTP
    API2-->>F: Successo
    F->>U: Conferma cambio email
\`\`\`

**Passaggi**:
1. Admin inserisce nuova email nel form
2. Click su "Cambia Email"
3. Frontend valida formato email
4. Frontend invia richiesta a `/api/admin/send-otp-email`
5. Backend recupera numero telefono dal database
6. Backend genera OTP e lo salva in Firestore
7. Backend invia SMS con Twilio
8. Admin riceve SMS sul telefono
9. Frontend mostra modale con input OTP
10. Admin inserisce codice a 4 cifre
11. Frontend invia richiesta a `/api/admin/update-email`
12. Backend verifica OTP (validità, scadenza, corrispondenza)
13. Backend aggiorna email in Firebase Auth
14. Backend aggiorna email in Firestore
15. Backend elimina OTP
16. Frontend mostra conferma successo

### Cambio Password

\`\`\`mermaid
sequenceDiagram
    participant U as Admin (UI)
    participant F as Frontend
    participant API1 as send-otp-password
    participant FS as Firestore
    participant R as Resend (Email)
    participant API2 as update-password
    participant FA as Firebase Auth

    U->>F: Inserisce nuova password
    F->>F: Valida requisiti password
    F->>API1: POST /api/admin/send-otp-password
    API1->>FS: Recupera email admin
    API1->>API1: Genera OTP 4 cifre
    API1->>FS: Salva OTP (scadenza 10min)
    API1->>R: Invia email con OTP
    R-->>U: Email ricevuta
    API1-->>F: Successo
    F->>U: Mostra modale OTP
    U->>F: Inserisce codice OTP
    F->>API2: POST /api/admin/update-password
    API2->>FS: Verifica OTP
    API2->>FA: Aggiorna password
    API2->>FS: Elimina OTP
    API2-->>F: Successo
    F->>U: Conferma cambio password
\`\`\`

**Passaggi**:
1. Admin inserisce nuova password (x2 per conferma)
2. Click su "Cambia Password"
3. Frontend valida requisiti password (8+ caratteri, 1 maiuscola, 1 minuscola, 2 numeri, 3 lettere)
4. Frontend invia richiesta a `/api/admin/send-otp-password`
5. Backend recupera email dal database
6. Backend genera OTP e lo salva in Firestore
7. Backend invia email con Resend
8. Admin riceve email
9. Frontend mostra modale con input OTP
10. Admin inserisce codice a 4 cifre
11. Frontend invia richiesta a `/api/admin/update-password`
12. Backend verifica OTP
13. Backend aggiorna password in Firebase Auth
14. Backend elimina OTP
15. Frontend mostra conferma successo

### Cambio Telefono

Identico al cambio password ma:
- API: `/api/admin/send-otp-phone` e `/api/admin/update-phone`
- Documento Firestore: `admin_otps/phone_change`
- Salva anche `newPhone` nel documento OTP

---

## Configurazione Richiesta

### Environment Variables

Aggiungi queste variabili al tuo progetto Vercel o file `.env.local`:

\`\`\`bash
# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tuodominio.com

# Firebase Admin (già configurato)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
\`\`\`

### Setup Twilio

1. **Registrazione**:
   - Vai su https://www.twilio.com/try-twilio
   - Crea account gratuito
   - Ricevi $15 di credito gratuito (~2000 SMS)

2. **Ottieni Credenziali**:
   - Dashboard → Account → Account Info
   - Copia `Account SID` → `TWILIO_ACCOUNT_SID`
   - Copia `Auth Token` → `TWILIO_AUTH_TOKEN`

3. **Acquista Numero**:
   - Dashboard → Phone Numbers → Buy a Number
   - Cerca numero italiano (+39) con capacità SMS
   - Acquista numero (circa €1/mese)
   - Copia numero → `TWILIO_PHONE_NUMBER`

4. **Verifica Numeri** (modalità trial):
   - Dashboard → Phone Numbers → Verified Caller IDs
   - Aggiungi il tuo numero di telefono
   - Conferma con SMS di verifica

### Setup Resend

1. **Verifica**:
   - Resend è già configurato nel progetto
   - Verifica che `RESEND_API_KEY` sia impostata
   - Verifica che `RESEND_FROM_EMAIL` sia configurata

2. **Dominio Email** (consigliato per produzione):
   - Dashboard Resend → Domains
   - Aggiungi il tuo dominio
   - Configura record DNS (SPF, DKIM)
   - Usa email tipo `noreply@tuodominio.com`

### Configurazione Database Firestore

Assicurati che il documento admin in Firestore abbia:

\`\`\`javascript
// Collezione: users
// Documento: {userId dell'admin}
{
  email: "admin@tuodominio.com",
  phone: "+39xxxxxxxxxx",        // IMPORTANTE: con prefisso +39
  role: "admin",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
\`\`\`

**Setup iniziale telefono**:
\`\`\`javascript
// Via Firestore Console
1. Vai su Firestore Database
2. Collezione "users"
3. Trova documento admin (uid Firebase Auth)
4. Aggiungi campo: phone = "+39xxxxxxxxxx"
5. Salva
\`\`\`

---

## Sicurezza e Validazione

### Frontend

#### Validazione Email
\`\`\`typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  alert("Email non valida")
  return
}
\`\`\`

#### Validazione Password
\`\`\`typescript
// Minimo 8 caratteri
if (password.length < 8) return false

// Almeno 1 maiuscola e 1 minuscola
const hasUpperCase = /[A-Z]/.test(password)
const hasLowerCase = /[a-z]/.test(password)

// Almeno 2 numeri
const numberCount = (password.match(/\d/g) || []).length >= 2

// Almeno 3 lettere
const letterCount = (password.match(/[a-zA-Z]/g) || []).length >= 3

if (!hasUpperCase || !hasLowerCase || !numberCount || !letterCount) {
  alert("Password non rispetta i requisiti")
  return
}
\`\`\`

#### Validazione Telefono
\`\`\`typescript
const phoneRegex = /^(\+39)?[\s]?[0-9]{10}$/
if (!phoneRegex.test(phone)) {
  alert("Numero non valido. Formato: +39xxxxxxxxxx")
  return
}
\`\`\`

#### Validazione OTP
\`\`\`typescript
if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
  alert("Inserisci un codice a 4 cifre")
  return
}
\`\`\`

### Backend

#### Rate Limiting
Considera l'aggiunta di rate limiting per prevenire abusi:

\`\`\`typescript
// Esempio: max 3 tentativi ogni 5 minuti
const attemptsKey = `otp_attempts_${userId}`
const attempts = await redis.incr(attemptsKey)
await redis.expire(attemptsKey, 300) // 5 minuti

if (attempts > 3) {
  return NextResponse.json(
    { error: "Troppi tentativi. Riprova tra 5 minuti" },
    { status: 429 }
  )
}
\`\`\`

#### Verifica Scadenza OTP
\`\`\`typescript
if (otpData.expiresAt.toDate() < new Date()) {
  await deleteDoc(doc(db, 'admin_otps', documentId))
  return NextResponse.json(
    { error: "Codice OTP scaduto" },
    { status: 400 }
  )
}
\`\`\`

#### Eliminazione OTP Dopo Uso
\`\`\`typescript
// Anche in caso di successo, elimina sempre l'OTP
await deleteDoc(doc(db, 'admin_otps', documentId))
\`\`\`

---

## Troubleshooting

### Problema: SMS non arriva

**Possibili Cause**:
1. **Numero non verificato** (modalità trial Twilio)
   - Soluzione: Verifica il numero su Twilio Dashboard

2. **Credenziali errate**
   - Verifica `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - Controlla nei log del server per errori Twilio

3. **Credito Twilio esaurito**
   - Dashboard Twilio → Billing
   - Ricarica credito

4. **Numero non valido nel database**
   - Verifica campo `phone` in Firestore
   - Formato corretto: `+39xxxxxxxxxx`

**Debug**:
\`\`\`typescript
// In send-otp-email.ts, aggiungi:
console.log('[v0] Twilio config:', {
  accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...',
  hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
  twilioPhone: process.env.TWILIO_PHONE_NUMBER,
  targetPhone: adminPhone
})
\`\`\`

### Problema: Email non arriva

**Possibili Cause**:
1. **Finisce in spam**
   - Controlla cartella spam
   - Configura dominio personalizzato su Resend

2. **Credenziali Resend errate**
   - Verifica `RESEND_API_KEY` e `RESEND_FROM_EMAIL`

3. **Email non verificata** (modalità sviluppo Resend)
   - Dashboard Resend → verifica email destinatario

**Debug**:
\`\`\`typescript
// In send-otp-password.ts, aggiungi:
const result = await resend.emails.send({...})
console.log('[v0] Resend result:', result)
\`\`\`

### Problema: "Codice OTP non valido"

**Possibili Cause**:
1. **Codice scaduto** (> 10 minuti)
   - Soluzione: Genera nuovo codice

2. **Codice già usato**
   - Soluzione: Genera nuovo codice

3. **Errore di digitazione**
   - Verifica di aver inserito tutte e 4 le cifre

4. **Bug nel salvataggio/recupero**
   - Controlla Firestore Console → collezione `admin_otps`
   - Verifica che il documento esista con codice e scadenza

**Debug**:
\`\`\`typescript
// In update-email.ts, aggiungi:
console.log('[v0] OTP verification:', {
  inputOTP: otp,
  savedOTP: otpData.code,
  expiresAt: otpData.expiresAt.toDate(),
  now: new Date(),
  isExpired: otpData.expiresAt.toDate() < new Date()
})
\`\`\`

### Problema: Cambio email non funziona

**Verifica**:
1. **Firebase Auth permissions**
   - Admin SDK ha permessi di modifica utenti?

2. **Documento Firestore**
   - Il documento admin esiste in `users/${userId}`?

3. **UserID corretto**
   - Verifica che `userId` passato sia corretto

**Debug**:
\`\`\`typescript
// In update-email.ts, aggiungi:
try {
  await adminAuth.updateUser(userId, { email: otpData.newEmail })
  console.log('[v0] Firebase Auth updated successfully')
} catch (error) {
  console.error('[v0] Firebase Auth error:', error)
  throw error
}
\`\`\`

### Problema: "userId non trovato"

**Causa**: Il componente non riceve correttamente lo userId dal context

**Soluzione**:
\`\`\`typescript
// In admin-security-settings.tsx, verifica:
const { user } = useAuth()
console.log('[v0] Current user:', user?.uid)

if (!user?.uid) {
  alert("Errore: utente non autenticato")
  return
}
\`\`\`

---

## Best Practices

### 1. Gestione Errori
Mostra sempre messaggi chiari all'utente:
\`\`\`typescript
try {
  const response = await fetch('/api/admin/update-email', {...})
  const data = await response.json()
  
  if (!response.ok) {
    alert(data.error || 'Errore durante l\'aggiornamento')
    return
  }
  
  alert('Email aggiornata con successo!')
} catch (error) {
  alert('Errore di connessione. Riprova.')
  console.error('[v0] Update error:', error)
}
\`\`\`

### 2. Logging
Usa sempre il prefisso `[v0]` per i log di debug:
\`\`\`typescript
console.log('[v0] Sending OTP to:', maskedPhone)
console.error('[v0] Twilio error:', error.message)
\`\`\`

### 3. Sicurezza
- Non loggare mai codici OTP completi in produzione
- Non loggare mai password o credenziali complete
- Usa sempre HTTPS in produzione
- Imposta correttamente CORS

### 4. Testing
Prima di andare in produzione:
1. Testa il cambio email
2. Testa il cambio password
3. Testa il cambio telefono
4. Testa codici OTP scaduti
5. Testa codici OTP errati
6. Testa rate limiting (se implementato)

### 5. Monitoring
Monitora:
- Costo SMS Twilio (Dashboard)
- Email inviate Resend (Dashboard)
- Documenti OTP in Firestore (pulisci quelli scaduti)
- Log errori del server

---

## Costi Stimati

### Twilio (SMS)
- **Setup**: $15 credito gratuito
- **Numero**: ~€1/mese
- **SMS**: €0.007 per SMS
- **Stima annuale**: €12 + (numero SMS × €0.007)
  - Es: 50 SMS/anno = €12 + €0.35 = **€12.35/anno**

### Resend (Email)
- **Piano Free**: 3000 email/mese (gratuito)
- **Piano Pro**: $20/mese (100k email/mese)
- **Stima**: **Gratuito** per uso admin

### Totale Stimato
**€12-15/anno** per uso normale (pochi SMS al mese)

---

## Manutenzione

### Pulizia OTP Scaduti
Crea un cron job per pulire OTP scaduti:

\`\`\`typescript
// app/api/cron/cleanup-otps/route.ts
export async function GET() {
  const now = new Date()
  const otpsRef = collection(db, 'admin_otps')
  const snapshot = await getDocs(otpsRef)
  
  let deleted = 0
  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.expiresAt.toDate() < now) {
      await deleteDoc(doc.ref)
      deleted++
    }
  }
  
  return NextResponse.json({ deleted })
}
\`\`\`

### Monitoraggio Logs
Verifica regolarmente i log del server per:
- Errori Twilio
- Errori Resend
- Tentativi falliti di verifica OTP
- Errori di autenticazione

---

## Contatti e Supporto

Per problemi o domande:
- **Twilio Support**: https://www.twilio.com/help
- **Resend Support**: https://resend.com/support
- **Firebase Support**: https://firebase.google.com/support

---

**Versione Documento**: 1.0
**Ultimo Aggiornamento**: 2025-01-16
