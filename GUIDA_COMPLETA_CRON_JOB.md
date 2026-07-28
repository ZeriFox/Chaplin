# Guida Completa: Sistema di Email Automatiche con Cron Job

## 📋 Indice

1. [Introduzione](#introduzione)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Le Tre API Cron](#le-tre-api-cron)
4. [Configurazione Vercel](#configurazione-vercel)
5. [Configurazione cron-job.org](#configurazione-cron-joborg)
6. [Testing delle API](#testing-delle-api)
7. [Monitoraggio](#monitoraggio)
8. [Troubleshooting](#troubleshooting)
9. [Manutenzione](#manutenzione)

---

## 🎯 Introduzione

Questo sistema invia automaticamente 3 tipi di email ai tuoi utenti:

1. **Check-in Reminder**: Il giorno prima del check-in
2. **Monthly Reminder**: 1 volta al mese dalla prenotazione fino al check-in
3. **Promotional Emails**: Ogni 2 mesi per 2 anni agli utenti inattivi

Le email vengono inviate automaticamente tramite **cron-job.org**, un servizio gratuito che chiama le tue API agli orari programmati.

---

## 🏗️ Architettura del Sistema

\`\`\`
┌─────────────────┐
│  cron-job.org   │  ← Servizio esterno che chiama le API
└────────┬────────┘
         │ Ogni giorno alle 9:00, 10:00, 11:00
         ↓
┌─────────────────────────────────────────┐
│  Vercel (le tue API protette)           │
│                                         │
│  /api/cron/send-checkin-reminders       │
│  /api/cron/send-monthly-reminders       │
│  /api/cron/send-promotional-emails      │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────┐     ┌─────────────────┐
│   Firebase      │     │     Resend      │
│  (Database)     │     │  (Email Service)│
└─────────────────┘     └─────────────────┘
\`\`\`

---

## 📧 Le Tre API Cron

### 1. Check-in Reminder (`/api/cron/send-checkin-reminders`)

**Scopo**: Ricordare agli utenti il check-in il giorno prima

**Logica**:
- Viene eseguita ogni giorno alle **9:00**
- Cerca tutte le prenotazioni con check-in **domani**
- Filtra solo prenotazioni con status `paid` o `confirmed`
- Rispetta le preferenze utente (`notifications.checkinReminders`)
- Invia email con dettagli della prenotazione

**Esempio email**:
\`\`\`
Oggetto: Promemoria Check-in - Domani alle [ora]

Ciao [nome],

Il tuo check-in è domani alle [ora]!

Dettagli prenotazione:
- Check-in: [data]
- Check-out: [data]
- Ospiti: [numero]
- Prezzo totale: €[importo]

Ci vediamo presto!
\`\`\`

**File**: `app/api/cron/send-checkin-reminders/route.ts`

---

### 2. Monthly Reminder (`/api/cron/send-monthly-reminders`)

**Scopo**: Mantenere l'entusiasmo degli utenti con un countdown mensile

**Logica**:
- Viene eseguita ogni giorno alle **10:00**
- Cerca tutte le prenotazioni future confermate
- Verifica se è passato **1 mese** dall'ultimo invio (campo `lastMonthlyReminder`)
- Calcola i giorni rimanenti fino al check-in
- Rispetta le preferenze utente (`notifications.monthlyReminders`)
- Aggiorna il campo `lastMonthlyReminder` dopo l'invio

**Esempio email**:
\`\`\`
Oggetto: Mancano solo [X] giorni alla tua vacanza!

Ciao [nome],

La tua vacanza si avvicina! Mancano solo [X] giorni al check-in.

Dettagli prenotazione:
- Check-in: [data]
- Check-out: [data]
- Ospiti: [numero]

Non vediamo l'ora di ospitarti!
\`\`\`

**File**: `app/api/cron/send-monthly-reminders/route.ts`

---

### 3. Promotional Emails (`/api/cron/send-promotional-emails`)

**Scopo**: Riportare gli utenti inattivi a prenotare di nuovo

**Logica**:
- Viene eseguita ogni giorno alle **11:00**
- Cerca utenti che NON hanno prenotato negli ultimi **2 mesi**
- Verifica se sono passati **2 mesi** dall'ultima email promozionale
- Invia massimo **12 email** (1 ogni 2 mesi per 2 anni)
- Rispetta le preferenze utente (`notifications.promos`)
- Aggiorna `lastPromotionalEmail` e `promotionalEmailCount`

**Esempio email**:
\`\`\`
Oggetto: Ti manca la nostra struttura? Offerta speciale per te!

Ciao [nome],

È passato un po' di tempo dall'ultima volta che ci hai visitato.

Abbiamo un'offerta speciale solo per te:
[Dettagli offerta]

Prenota ora e risparmia!
\`\`\`

**File**: `app/api/cron/send-promotional-emails/route.ts`

---

## ⚙️ Configurazione Vercel

### 1. Aggiungi la variabile d'ambiente `CRON_SECRET`

1. Vai su **vercel.com** e apri il tuo progetto
2. Vai su **Settings** → **Environment Variables**
3. Clicca **Add New**
4. Inserisci:
   - **Name**: `CRON_SECRET`
   - **Value**: Una password sicura (es: `872124083ae6f2da08bba0bf842dff07`)
5. Seleziona tutti gli ambienti: **Production**, **Preview**, **Development**
6. Clicca **Save**
7. **IMPORTANTE**: Rideploya il progetto per applicare la variabile

### 2. Verifica le altre variabili d'ambiente

Assicurati che siano configurate:

- ✅ `RESEND_API_KEY` (per inviare email)
- ✅ `RESEND_FROM_EMAIL` (mittente delle email)
- ✅ Firebase Admin SDK (per accedere al database)

---

## 🔧 Configurazione cron-job.org

### Passo 1: Crea un account

1. Vai su **https://cron-job.org**
2. Registrati gratuitamente
3. Verifica la tua email

### Passo 2: Crea i 3 Cron Job

#### **Job 1: Check-in Reminder**

1. Clicca **"+ CREA CRONJOB"**
2. **Scheda BASE**:
   - **Title**: `Check-in Reminder`
   - **URL**: `https://www.al22suite.com/api/cron/send-checkin-reminders`
   - **Attiva cronjob**: ✅ ON
   - **Esecuzione programmata**: Ogni giorno alle **09:00**
   - **Fuso orario**: `Europe/Rome`

3. **Scheda AVANZATE**:
   - **Headers** → Clicca **"+ AGGIUNGI"**:
     - **Chiave**: `Authorization`
     - **Valore**: `Bearer 872124083ae6f2da08bba0bf842dff07` (usa la stessa password di Vercel)
   - **Metodo HTTP richiesta**: `GET`
   - **Timeout**: `30` secondi
   - **Considera i reindirizzamenti con codice di stato HTTP 3xx come un successo**: ✅ ON

4. Clicca **"SALVA"**

---

#### **Job 2: Monthly Reminder**

1. Clicca **"+ CREA CRONJOB"**
2. **Scheda BASE**:
   - **Title**: `Monthly Booking Reminder`
   - **URL**: `https://www.al22suite.com/api/cron/send-monthly-reminders`
   - **Attiva cronjob**: ✅ ON
   - **Esecuzione programmata**: Ogni giorno alle **10:00**
   - **Fuso orario**: `Europe/Rome`

3. **Scheda AVANZATE**:
   - **Headers** → Clicca **"+ AGGIUNGI"**:
     - **Chiave**: `Authorization`
     - **Valore**: `Bearer 872124083ae6f2da08bba0bf842dff07`
   - **Metodo HTTP richiesta**: `GET`
   - **Timeout**: `30` secondi
   - **Considera i reindirizzamenti con codice di stato HTTP 3xx come un successo**: ✅ ON

4. Clicca **"SALVA"**

---

#### **Job 3: Promotional Emails**

1. Clicca **"+ CREA CRONJOB"**
2. **Scheda BASE**:
   - **Title**: `Promotional Emails`
   - **URL**: `https://www.al22suite.com/api/cron/send-promotional-emails`
   - **Attiva cronjob**: ✅ ON
   - **Esecuzione programmata**: Ogni giorno alle **11:00**
   - **Fuso orario**: `Europe/Rome`

3. **Scheda AVANZATE**:
   - **Headers** → Clicca **"+ AGGIUNGI"**:
     - **Chiave**: `Authorization`
     - **Valore**: `Bearer 872124083ae6f2da08bba0bf842dff07`
   - **Metodo HTTP richiesta**: `GET`
   - **Timeout**: `30` secondi
   - **Considera i reindirizzamenti con codice di stato HTTP 3xx come un successo**: ✅ ON

4. Clicca **"SALVA"**

---

## 🧪 Testing delle API

### Metodo 1: Test su cron-job.org (consigliato)

1. Vai su **cron-job.org** → **Cronjobs**
2. Clicca sul job che vuoi testare
3. Clicca **"TEST DI ESECUZIONE"**
4. Verifica il risultato:
   - ✅ **200 OK** = Funziona correttamente
   - ❌ **401 Unauthorized** = Header Authorization mancante o errato
   - ❌ **500 Internal Server Error** = Bug nel codice
   - ❌ **404 Not Found** = URL sbagliato

### Metodo 2: Test manuale con curl

\`\`\`bash
curl -X GET \
  https://www.al22suite.com/api/cron/send-checkin-reminders \
  -H "Authorization: Bearer 872124083ae6f2da08bba0bf842dff07"
\`\`\`

### Metodo 3: Test dal browser (NON funziona)

Se apri l'URL direttamente nel browser, vedrai `{"error":"Unauthorized"}` perché il browser non invia l'header Authorization. **Questo è normale e corretto!**

---

## 📊 Monitoraggio

### Su cron-job.org

1. Vai su **Cronjobs**
2. Ogni job mostra:
   - **Ultima esecuzione**: Data e ora dell'ultimo invio
   - **Prossima esecuzione**: Quando verrà eseguito di nuovo
   - **Stato**: ✅ Successo o ❌ Errore
   - **Cronologia**: Clicca per vedere tutte le esecuzioni passate

### Su Vercel

1. Vai su **Logs** nel tuo progetto Vercel
2. Filtra per `/api/cron/`
3. Verifica i log delle esecuzioni:
   - `[Check-in Reminder] Sent X emails`
   - `[Monthly Reminder] Sent X emails`
   - `[Promotional] Sent X emails`

### Nel Database Firebase

Verifica che i campi vengano aggiornati:
- `lastMonthlyReminder`: Data dell'ultimo monthly reminder
- `lastPromotionalEmail`: Data dell'ultima email promozionale
- `promotionalEmailCount`: Numero di email promozionali inviate (max 12)

---

## 🔍 Troubleshooting

### Problema: 401 Unauthorized

**Causa**: Header Authorization mancante o errato

**Soluzione**:
1. Verifica che su cron-job.org l'header sia:
   - **Chiave**: `Authorization`
   - **Valore**: `Bearer <la-tua-password>` (con "Bearer " all'inizio)
2. Verifica che la password sia identica a `CRON_SECRET` su Vercel
3. Rideploya il progetto su Vercel dopo aver aggiunto `CRON_SECRET`

---

### Problema: 500 Internal Server Error

**Causa**: Bug nel codice o variabili d'ambiente mancanti

**Soluzione**:
1. Controlla i log su Vercel per vedere l'errore esatto
2. Verifica che tutte le variabili d'ambiente siano configurate:
   - `CRON_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - Firebase Admin SDK
3. Verifica che il database Firebase sia accessibile

---

### Problema: 404 Not Found

**Causa**: URL sbagliato

**Soluzione**:
Verifica che gli URL siano esatti:
- `https://www.al22suite.com/api/cron/send-checkin-reminders`
- `https://www.al22suite.com/api/cron/send-monthly-reminders`
- `https://www.al22suite.com/api/cron/send-promotional-emails`

---

### Problema: 307/308 Redirect

**Causa**: L'URL sta reindirizzando a un altro indirizzo

**Soluzione**:
Nella scheda AVANZATE su cron-job.org, attiva:
- **"Considera i reindirizzamenti con codice di stato HTTP 3xx come un successo"**: ✅ ON

---

### Problema: Le email non arrivano

**Causa**: Preferenze utente disabilitate o email non valida

**Soluzione**:
1. Verifica che l'utente abbia le notifiche abilitate:
   - `notifications.checkinReminders = true`
   - `notifications.monthlyReminders = true`
   - `notifications.promos = true`
2. Verifica che l'email dell'utente sia valida
3. Controlla i log di Resend per vedere se ci sono errori di invio

---

## 🛠️ Manutenzione

### Cambiare gli orari di invio

1. Vai su **cron-job.org** → **Cronjobs**
2. Clicca sul job da modificare
3. Nella scheda **BASE**, cambia **"Esecuzione programmata"**
4. Clicca **"SALVA"**

---

### Modificare i template delle email

I template sono nei file:
- `app/api/cron/send-checkin-reminders/route.ts`
- `app/api/cron/send-monthly-reminders/route.ts`
- `app/api/cron/send-promotional-emails/route.ts`

Cerca la sezione `await resend.emails.send()` e modifica:
- `subject`: Oggetto dell'email
- `html`: Contenuto HTML dell'email

Dopo le modifiche, rideploya su Vercel.

---

### Cambiare i periodi di invio

#### Monthly Reminder (da 1 mese a X giorni)

Nel file `app/api/cron/send-monthly-reminders/route.ts`, cerca:

\`\`\`typescript
const oneMonthAgo = new Date(now)
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1) // <-- Cambia qui
\`\`\`

Cambia in:
\`\`\`typescript
oneMonthAgo.setDate(oneMonthAgo.getDate() - 15) // Ogni 15 giorni
\`\`\`

---

#### Promotional Emails (da 2 mesi a X giorni)

Nel file `app/api/cron/send-promotional-emails/route.ts`, cerca:

\`\`\`typescript
const twoMonthsAgo = new Date(now)
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2) // <-- Cambia qui
\`\`\`

Cambia in:
\`\`\`typescript
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 3) // Ogni 3 mesi
\`\`\`

E per il numero massimo di email:

\`\`\`typescript
if (user.promotionalEmailCount >= 12) { // <-- Cambia qui
\`\`\`

Cambia in:
\`\`\`typescript
if (user.promotionalEmailCount >= 6) { // Max 6 email
\`\`\`

---

### Disabilitare temporaneamente un cron job

1. Vai su **cron-job.org** → **Cronjobs**
2. Clicca sul job da disabilitare
3. Nella scheda **BASE**, disattiva **"Attiva cronjob"**
4. Clicca **"SALVA"**

---

### Aggiungere nuovi campi al database

Se aggiungi nuovi campi alle prenotazioni o agli utenti, ricorda di:

1. Aggiornare le query Firebase nelle API
2. Aggiornare i template delle email
3. Testare le API prima di deployare in produzione

---

## 📝 Riepilogo Finale

✅ **3 API cron** create e protette con Authorization  
✅ **cron-job.org** configurato per chiamare le API ogni giorno  
✅ **Check-in Reminder**: Il giorno prima alle 9:00  
✅ **Monthly Reminder**: 1 volta al mese alle 10:00  
✅ **Promotional Emails**: Ogni 2 mesi alle 11:00 (max 12 email)  
✅ **Sicurezza**: Le API sono protette e rifiutano richieste non autorizzate  
✅ **Monitoraggio**: Puoi verificare le esecuzioni su cron-job.org e Vercel  

**Il sistema è pronto e funzionante!** 🎉

---

## 📞 Supporto

Se hai problemi:

1. Controlla la sezione **Troubleshooting** di questa guida
2. Verifica i log su Vercel per errori specifici
3. Testa le API manualmente su cron-job.org
4. Verifica che tutte le variabili d'ambiente siano configurate

---

**Ultima modifica**: 2 Novembre 2025
