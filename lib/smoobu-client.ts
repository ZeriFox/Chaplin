/**
 * Smoobu API Client
 * Centralized client for all Smoobu API interactions
 * Smoobu uses a single API Key for authentication (simpler than Beds24)
 * 
 * API Documentation: https://docs.smoobu.com
 */

const SMOOBU_API_URL = "https://login.smoobu.com/api"
const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY

// Channel IDs in Smoobu
// NOTE: In Smoobu, channel IDs are DYNAMIC per user (e.g. 465614 = Booking.com for one user).
// Only the following IDs are FIXED across all users:
export const SMOOBU_CHANNELS = {
  DIRECT: parseInt(process.env.SMOOBU_CHANNEL_ID || "70"),   // Direct/manual bookings
  LOCKED: parseInt(process.env.SMOOBU_CHANNEL_ID_Locked || "11"), // Blocked channel (default: 11)
  BLOCKED_AUTO: 110,  // Blocked channel auto
}

/**
 * Detect booking source from channel name (case-insensitive)
 * This is the CORRECT way to identify sources in Smoobu since channel IDs are dynamic per user
 */
export function detectSourceFromChannelName(channelName: string): string {
  const name = (channelName || "").toLowerCase()
  if (name.includes("booking")) return "booking"
  if (name.includes("airbnb")) return "airbnb"
  if (name.includes("expedia")) return "expedia"
  if (name.includes("vrbo") || name.includes("homeaway")) return "vrbo"
  if (name.includes("tripadvisor")) return "tripadvisor"
  if (name.includes("blocked")) return "blocked"
  if (name.includes("api") || name.includes("manual")) return "direct"
  return "direct"
}

// Room name to Smoobu apartment ID mapping
// These IDs come from Smoobu > Configurazione > Proprieta
// You can find them by calling GET /api/apartments
export const SMOOBU_ROOM_MAP: Record<string, string> = {
  // Map your Firebase room names to Smoobu apartment names
  // Will be populated dynamically via getApartments()
}

// Cache for apartment IDs (loaded once)
let apartmentCache: SmoobuApartment[] | null = null

export interface SmoobuReservation {
  id: number
  "reference-id": string
  type: string
  arrival: string      // YYYY-MM-DD
  departure: string    // YYYY-MM-DD
  "created-at": string
  "modified-at": string
  apartment: {
    id: number
    name: string
  }
  channel: {
    id: number
    name: string
  }
  "guest-name": string
  firstname: string
  lastname: string
  email: string
  phone: string
  adults: number
  children: number
  "check-in": string   // HH:MM
  "check-out": string  // HH:MM
  notice: string
  price: number
  "price-paid": number
  prepayment: number
  "prepayment-paid": number
  deposit: number
  "deposit-paid": number
  language: string
  "guest-app-url": string
  "is-blocked-booking": boolean
  "guest-id": number
  address?: {
    street?: string
    postalCode?: string
    location?: string
    country?: {
      id: number
      name: string
    }
  }
}

export interface SmoobuBooking {
  id: string
  roomId: string
  arrival: string
  departure: string
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  price: number
  status: string
  referer: string
  apiSourceId?: number
  apiSource?: string
  channelId?: number
  channelName?: string
  created: string
  modified: string
  notes?: string
}

export interface SmoobuReview {
  id: string
  bookingId: string
  roomId: string
  rating: number
  comment: string
  guestName: string
  source: "airbnb" | "booking" | "expedia" | "direct"
  date: string
  response?: string
}

export interface SmoobuApartment {
  id: number
  name: string
  type: {
    id: number
    name: string
  }
  location: {
    street?: string
    postalCode?: string
    city?: string
    country?: string
    latitude?: number
    longitude?: number
  }
  timezone: string
  currency: string
  arrivalTime: string
  departureTime: string
  rooms: {
    maxOccupancy: number
    bedrooms: number
    bathrooms: number
    beds: number
  }
}

export interface SmoobuRate {
  date: string
  price: number
  minLengthOfStay: number
  available: number
}

class SmoobuClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    if (!SMOOBU_API_KEY) {
      throw new Error("SMOOBU_API_KEY environment variable is required")
    }
    this.baseUrl = SMOOBU_API_URL
    this.apiKey = SMOOBU_API_KEY
  }

  /**
   * Make an authenticated request to Smoobu API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.apiKey,
        "Cache-Control": "no-cache",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Smoobu] API Error: ${response.status} - ${error}`)
      throw new Error(`Smoobu API Error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * Convert Smoobu reservation to our standard booking format
   */
  private convertToBooking(reservation: SmoobuReservation): SmoobuBooking {
    // Use channel NAME to detect source (channel IDs are dynamic per Smoobu user)
    const channelName = reservation.channel?.name || "Direct"
    const referer = detectSourceFromChannelName(channelName)
    const apiSource = channelName

    return {
      id: reservation.id.toString(),
      roomId: reservation.apartment?.id?.toString() || "",
      arrival: reservation.arrival,
      departure: reservation.departure,
      numAdult: reservation.adults || 1,
      numChild: reservation.children || 0,
      firstName: reservation.firstname || reservation["guest-name"]?.split(" ")[0] || "",
      lastName: reservation.lastname || reservation["guest-name"]?.split(" ").slice(1).join(" ") || "",
      email: reservation.email || "",
      phone: reservation.phone || "",
      price: reservation.price || 0,
      status: reservation["is-blocked-booking"] ? "blocked" : "confirmed",
      referer,
      apiSourceId: reservation.channel?.id,
      apiSource,
      channelId: reservation.channel?.id,
      channelName,
      created: reservation["created-at"],
      modified: reservation["modified-at"],
      notes: reservation.notice || "",
    }
  }

  /**
   * Fetch all reservations from Smoobu
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   * @param apartmentId - Optional apartment ID to filter by
   */
  async getBookings(from?: string, to?: string, apartmentId?: string): Promise<SmoobuBooking[]> {
    const allReservations: SmoobuReservation[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const params = new URLSearchParams()
      if (from) params.append("from", from)
      if (to) params.append("to", to)
      if (apartmentId) params.append("apartmentId", apartmentId)
      params.append("pageSize", "100")
      params.append("page", String(page))

      const endpoint = `/reservations?${params.toString()}`
      
      try {
        const response = await this.request<{ 
          bookings: SmoobuReservation[]
          page_count: number
          page: number
          total_items: number
        }>(endpoint)
        
        const reservations = response.bookings || []
        allReservations.push(...reservations)
        
        console.log(`[Smoobu] Page ${page}: ${reservations.length} reservations (total so far: ${allReservations.length}/${response.total_items || "?"})`)
        
        // Log channel names for debugging
        if (page === 1 && reservations.length > 0) {
          const channels = [...new Set(reservations.map(r => `${r.channel?.name || "unknown"} (id:${r.channel?.id})`))]
          console.log(`[Smoobu] Channels found:`, channels)
        }
        
        hasMore = page < (response.page_count || 1)
        page++
      } catch (error) {
        console.error("[Smoobu] Error fetching bookings page", page, ":", error)
        throw error
      }
    }

    console.log(`[Smoobu] Total reservations retrieved: ${allReservations.length}`)

    const bookings = allReservations.map(r => this.convertToBooking(r))
    
    // Log breakdown by source
    const sourceBreakdown: Record<string, number> = {}
    for (const b of bookings) {
      sourceBreakdown[b.referer] = (sourceBreakdown[b.referer] || 0) + 1
    }
    console.log(`[Smoobu] Bookings by source (from channel names):`, sourceBreakdown)
    
    return bookings
  }

  /**
   * Fetch bookings from Booking.com only
   */
  async getBookingComBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const bookingComBookings = allBookings.filter(b => b.referer === "booking")
    console.log(`[Smoobu] Filtered ${bookingComBookings.length} Booking.com bookings from ${allBookings.length} total`)
    return bookingComBookings
  }

  /**
   * Fetch bookings from Airbnb only
   */
  async getAirbnbBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const airbnbBookings = allBookings.filter(b => b.referer === "airbnb")
    console.log(`[Smoobu] Filtered ${airbnbBookings.length} Airbnb bookings from ${allBookings.length} total`)
    return airbnbBookings
  }

  /**
   * Fetch bookings from Expedia only
   */
  async getExpediaBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const expediaBookings = allBookings.filter(b => b.referer === "expedia")
    console.log(`[Smoobu] Filtered ${expediaBookings.length} Expedia bookings from ${allBookings.length} total`)
    return expediaBookings
  }

  /**
   * Fetch direct bookings only
   */
  async getDirectBookings(from?: string, to?: string): Promise<SmoobuBooking[]> {
    const allBookings = await this.getBookings(from, to)
    const directBookings = allBookings.filter(b => b.referer === "direct")
    console.log(`[Smoobu] Filtered ${directBookings.length} direct bookings from ${allBookings.length} total`)
    return directBookings
  }

  /**
   * Fetch a single reservation by ID
   */
  async getBooking(bookingId: string): Promise<SmoobuBooking> {
    const response = await this.request<SmoobuReservation>(`/reservations/${bookingId}`)
    return this.convertToBooking(response)
  }

  /**
   * Get all apartments (rooms) from Smoobu
   */
  async getApartments(): Promise<SmoobuApartment[]> {
    const response = await this.request<{ apartments: SmoobuApartment[] }>("/apartments")
    return response.apartments || []
  }

  /**
   * Get rates for an apartment
   * @param apartmentId - The apartment ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getRates(apartmentId: string, startDate: string, endDate: string): Promise<SmoobuRate[]> {
    const params = new URLSearchParams({
      apartments: `[${apartmentId}]`,
      start_date: startDate,
      end_date: endDate,
    })

    const endpoint = `/rates?${params.toString()}`
    const response = await this.request<{ data: Record<string, SmoobuRate[]> }>(endpoint)
    
    return response.data?.[apartmentId] || []
  }

  /**
   * Create a new reservation (for direct bookings from your website)
   * @param data - Reservation data
   */
  async createReservation(data: {
    apartmentId: number
    arrival: string
    departure: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    adults?: number
    children?: number
    price?: number
    notice?: string
  }): Promise<{ id: number }> {
    console.log("[Smoobu] Creating reservation:", data)

    const payload = {
      arrivalDate: data.arrival,
      departureDate: data.departure,
      apartmentId: data.apartmentId,
      channelId: SMOOBU_CHANNELS.DIRECT, // Direct booking
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || "",
      adults: data.adults || 1,
      children: data.children || 0,
      price: data.price || 0,
      notice: data.notice || "Prenotazione diretta dal sito",
    }

    const response = await this.request<{ id: number }>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("[Smoobu] Reservation created with ID:", response.id)
    return response
  }

  /**
   * Block dates for an apartment (for maintenance or manual blocking)
   * In Smoobu, blocking dates is done by creating a reservation with channelId = 70 (Direct)
   * and marking it as a blocked booking
   */
  async blockDates(apartmentId: string, from: string, to: string, reason = "maintenance"): Promise<{ id: number }> {
    console.log("[Smoobu] Blocking dates:", { apartmentId, from, to, reason })

    const payload = {
      arrivalDate: from,
      departureDate: to,
      apartmentId: parseInt(apartmentId),
      channelId: SMOOBU_CHANNELS.LOCKED,
      firstName: "BLOCKED",
      lastName: reason.toUpperCase(),
      email: "blocked@internal.local",
      notice: `Bloccato: ${reason}`,
      adults: 1,
      children: 0,
      price: 0,
    }

    const response = await this.request<{ id: number }>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    console.log("[Smoobu] Dates blocked with reservation ID:", response.id)
    return response
  }

  /**
   * Unblock dates (delete a blocking reservation)
   */
  async unblockDates(reservationId: string): Promise<void> {
    console.log("[Smoobu] Unblocking reservation:", reservationId)
    
    await this.request(`/reservations/${reservationId}`, {
      method: "DELETE",
    })

    console.log("[Smoobu] Reservation deleted successfully")
  }

  /**
   * Update a reservation
   */
  async updateReservation(reservationId: string, data: Partial<{
    arrival: string
    departure: string
    firstName: string
    lastName: string
    email: string
    phone: string
    adults: number
    children: number
    price: number
    notice: string
  }>): Promise<void> {
    console.log("[Smoobu] Updating reservation:", reservationId, data)

    const payload: Record<string, any> = {}
    
    if (data.arrival) payload.arrivalDate = data.arrival
    if (data.departure) payload.departureDate = data.departure
    if (data.firstName) payload.firstName = data.firstName
    if (data.lastName) payload.lastName = data.lastName
    if (data.email) payload.email = data.email
    if (data.phone) payload.phone = data.phone
    if (data.adults) payload.adults = data.adults
    if (data.children) payload.children = data.children
    if (data.price !== undefined) payload.price = data.price
    if (data.notice) payload.notice = data.notice

    await this.request(`/reservations/${reservationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    console.log("[Smoobu] Reservation updated successfully")
  }

  /**
   * Get cached apartments list (loads once, then cached)
   */
  async getApartmentsCached(): Promise<SmoobuApartment[]> {
    if (apartmentCache) return apartmentCache
    apartmentCache = await this.getApartments()
    console.log("[Smoobu] Loaded apartments:", apartmentCache.map(a => `${a.id}: ${a.name}`))
    return apartmentCache
  }

  /**
   * Find Smoobu apartment ID by name (fuzzy match)
   */
  async findApartmentByName(name: string): Promise<SmoobuApartment | null> {
    const apartments = await this.getApartmentsCached()
    const lower = name.toLowerCase()
    return apartments.find(a => 
      a.name.toLowerCase().includes(lower) || lower.includes(a.name.toLowerCase())
    ) || null
  }

  /**
   * Fetch reviews from guest messages and booking data
   * Smoobu aggregates reviews from channels (Airbnb, Booking.com)
   * We extract review-like data from completed bookings with messages
   */
  async getReviews(): Promise<SmoobuReview[]> {
    console.log("[Smoobu] Fetching reviews from bookings and messages...")
    const reviews: SmoobuReview[] = []

    try {
      // Get recent completed bookings (last 12 months)
      const now = new Date()
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)

      const from = yearAgo.toISOString().split("T")[0]
      const to = now.toISOString().split("T")[0]

      const bookings = await this.getBookings(from, to)
      const completedBookings = bookings.filter(b => 
        b.status === "confirmed" && 
        new Date(b.departure) < now &&
        (b.referer === "airbnb" || b.referer === "booking" || b.referer === "expedia")
      )

      console.log(`[Smoobu] Found ${completedBookings.length} completed channel bookings`)

      // For each booking, try to get messages that might contain reviews
      for (const booking of completedBookings) {
        try {
          const messages = await this.getMessages(booking.id)
          
          // Look for messages that look like reviews (from guest, after checkout)
          const reviewMessages = messages.filter((m: any) => 
            m.type === "guest" && 
            m.message && 
            m.message.length > 20
          )

          if (reviewMessages.length > 0) {
            const lastMsg = reviewMessages[reviewMessages.length - 1]
            reviews.push({
              id: `smoobu_${booking.id}`,
              bookingId: booking.id,
              roomId: booking.roomId,
              rating: 5, // Default rating, adjust based on channel
              comment: lastMsg.message,
              guestName: `${booking.firstName} ${booking.lastName}`.trim(),
              source: booking.referer as "airbnb" | "booking" | "direct",
              date: booking.departure,
              response: undefined,
            })
          }
        } catch {
          // Messages might not be available for all bookings
          continue
        }
      }

      console.log(`[Smoobu] Extracted ${reviews.length} reviews from messages`)
    } catch (error) {
      console.error("[Smoobu] Error fetching reviews:", error)
    }

    return reviews
  }

  /**
   * Get messages for a booking
   */
  async getMessages(bookingId: string): Promise<any[]> {
    try {
      const response = await this.request<{ messages: any[] }>(`/reservations/${bookingId}/messages`)
      return response.messages || []
    } catch {
      return []
    }
  }

  /**
   * Check availability for an apartment
   */
  async checkAvailability(apartmentId: string, from: string, to: string): Promise<boolean> {
    try {
      const rates = await this.getRates(apartmentId, from, to)
      return rates.every(rate => rate.available > 0)
    } catch (error) {
      console.error("[Smoobu] Error checking availability:", error)
      return false
    }
  }

  /**
   * Get webhook settings (for setting up webhooks)
   */
  async getWebhookSettings(): Promise<any> {
    return await this.request("/settings/webhooks")
  }
}

// Export singleton instance
export const smoobuClient = new SmoobuClient()
