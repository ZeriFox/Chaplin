import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, roomId, checkIn, checkOut, guests, userEmail, userName, services, notes } = body

    if (!userEmail || !services || services.length === 0) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const propertyEmail = process.env.SERVICE_EXTRA_EMAIL || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

    const servicesText = services.map((s: any) => `- ${s.name}: €${s.price}`).join("\n")
    const totalPrice = services.reduce((sum: number, s: any) => sum + s.price, 0)

    const db = getAdminDb()
    const requestRef = db.collection("extra_services_requests").doc()
    const requestId = requestRef.id

    await requestRef.set({
      requestId,
      bookingId: bookingId || null,
      userEmail,
      userName,
      roomId: roomId || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests: guests || null,
      services,
      notes: notes || "",
      totalPrice,
      status: "pending", // pending | confirmed | cancelled
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (bookingId) {
      const bookingRef = db.collection("bookings").doc(bookingId)
      await bookingRef.update({
        extraServicesRequestId: requestId,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await resend.emails.send({
      from: fromEmail,
      to: propertyEmail,
      replyTo: userEmail,
      subject: `🔔 Nuova richiesta servizi extra - ${userName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #1e40af; }
    .services-list { background: #dbeafe; border: 2px solid: #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .action-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Nuova Richiesta Servizi Extra</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1e40af;">Dettagli Cliente</h2>
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Nome Cliente:</span>
          <span>${userName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span>${userEmail}</span>
        </div>
        ${bookingId ? `<div class="detail-row"><span class="detail-label">ID Prenotazione:</span><span>${bookingId}</span></div>` : ""}
        ${roomId ? `<div class="detail-row"><span class="detail-label">Camera:</span><span>Camera ${roomId}</span></div>` : ""}
        ${checkIn ? `<div class="detail-row"><span class="detail-label">Check-in:</span><span>${checkIn}</span></div>` : ""}
        ${checkOut ? `<div class="detail-row"><span class="detail-label">Check-out:</span><span>${checkOut}</span></div>` : ""}
        ${guests ? `<div class="detail-row"><span class="detail-label">Ospiti:</span><span>${guests}</span></div>` : ""}
      </div>

      <h2 style="color: #1e40af;">Servizi Richiesti</h2>
      <div class="services-list">
        <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${servicesText}</pre>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #3b82f6;">
          <strong style="font-size: 18px; color: #1e40af;">Totale stimato: €${totalPrice.toFixed(2)}</strong>
        </div>
      </div>

      ${notes ? `<h3 style="color: #1e40af;">Note del Cliente</h3><p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${notes}</p>` : ""}

      <div class="action-box">
        <h3 style="margin-top: 0; color: #92400e;">⚠️ Azione Richiesta</h3>
        <p><strong>Per rispondere al cliente:</strong></p>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Rispondi direttamente a questa email (ReplyTo: ${userEmail})</li>
          <li>Conferma la disponibilità dei servizi richiesti</li>
          <li>Specifica quando e come il cliente deve effettuare il pagamento</li>
          <li>Fornisci eventuali dettagli aggiuntivi (orari, modalità, ecc.)</li>
        </ol>
        <p style="margin-top: 15px;"><strong>Per gestire la richiesta:</strong></p>
        <p>Accedi al pannello admin per cambiare lo stato della richiesta (In attesa → Confermata/Annullata)</p>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Questa richiesta è stata salvata nel database con ID: <code>${requestId}</code>
      </p>
    </div>
    
    <div class="footer">
      <p>Al 22 Suite & Spa Luxury Experience</p>
      <p>Polignano a Mare, Italia</p>
      <p>Questa è una email automatica dal sistema di gestione prenotazioni.</p>
    </div>
  </div>
</body>
</html>
      `,
    })

    await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: "✨ Richiesta servizi extra ricevuta - Al 22 Suite & Spa",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .services-list { background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .info-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; color: #1e40af; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Richiesta Ricevuta!</h1>
      <p>Al 22 Suite & Spa Luxury Experience</p>
    </div>
    
    <div class="content">
      <p>Ciao <strong>${userName}</strong>,</p>
      
      <p>Abbiamo ricevuto con successo la tua richiesta per i seguenti servizi extra:</p>
      
      <div class="services-list">
        <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${servicesText}</pre>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #3b82f6;">
          <strong style="font-size: 18px; color: #1e40af;">Totale stimato: €${totalPrice.toFixed(2)}</strong>
        </div>
      </div>

      ${notes ? `<h3 style="color: #1e40af;">Le tue note:</h3><p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${notes}</p>` : ""}

      <div class="info-box">
        <h3 style="margin-top: 0;">📧 Prossimi Passi</h3>
        <p><strong>Il nostro staff ti risponderà via email entro 24 ore per:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Confermare la disponibilità dei servizi richiesti</li>
          <li>Fornirti i dettagli su quando e come effettuare il pagamento</li>
          <li>Darti tutte le informazioni necessarie per i servizi</li>
        </ul>
        <p style="margin-top: 15px;"><strong>Stato attuale:</strong> ⏳ In attesa di conferma</p>
        <p style="font-size: 14px; margin-top: 10px;">Puoi controllare lo stato della tua richiesta accedendo al tuo account nella sezione "Le mie prenotazioni".</p>
      </div>

      <p style="margin-top: 30px;">Non vediamo l'ora di rendere il tuo soggiorno indimenticabile!</p>
      
      <p>A presto,<br><strong>Il Team di Al 22 Suite & Spa</strong></p>
    </div>
    
    <div class="footer">
      <p>Al 22 Suite & Spa Luxury Experience</p>
      <p>Polignano a Mare, Italia</p>
      <p>Hai domande? Rispondi a questa email, saremo felici di aiutarti!</p>
    </div>
  </div>
</body>
</html>
      `,
    })

    return NextResponse.json({ success: true, requestId })
  } catch (error) {
    console.error("Error sending extra services request:", error)
    return NextResponse.json({ error: "Errore durante l'invio" }, { status: 500 })
  }
}


