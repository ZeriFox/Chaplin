/**
 * Beds24 API Client V2
 * Centralized client for all Beds24 API interactions
 * Handles dual-token system:
 * - Read Token: Long-term token (~2 months) for GET operations
 * - Refresh Token: Generates short-term tokens for POST/PUT/DELETE operations
 */

import { db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

const BEDS24_API_URL = process.env.BEDS24_API_URL || "https://beds24.com/api/v2"
const BEDS24_READ_TOKEN = process.env.BEDS24_READ_TOKEN
const BEDS24_REFRESH_TOKEN = process.env.BEDS24_REFRESH_TOKEN
const BEDS24_PROPERTY_ID = process.env.BEDS24_PROPERTY_ID

interface TokenData {
  accessToken: string
  expiresAt: number // Unix timestamp
  refreshToken: string
}

interface WriteTokenData {
  accessToken: string
  expiresAt: number // Unix timestamp
}

export interface Beds24Booking {
  id: string
  roomId: string
  arrival: string // YYYY-MM-DD
  departure: string // YYYY-MM-DD
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  price: number
  status: string
  referer: string // 'airbnb' | 'booking' | 'direct'
  apiSourceId?: number
  apiSource?: string
  created: string
  modified: string
  notes?: string
  guestReview?: {
    rating?: number
    comment?: string
    date?: string
  }
  hostReview?: {
    rating?: number
    comment?: string
    date?: string
  }
}

export interface Beds24Review {
  id: string
  bookingId: string
  roomId: string
  rating: number
  comment: string
  guestName: string
  source: "airbnb" | "booking"
  date: string
  response?: string
}

export interface Beds24Room {
  id: string
  name: string
  maxPeople: number
  price: number
}

export class Beds24Client {
  private baseUrl: string
  private tokenData: TokenData | null = null
  private writeTokenData: WriteTokenData | null = null
  private refreshPromise: Promise<void> | null = null

  constructor() {
    if (!BEDS24_READ_TOKEN) {
      throw new Error("BEDS24_READ_TOKEN environment variable is required")
    }
    if (!BEDS24_REFRESH_TOKEN) {
      throw new Error("BEDS24_REFRESH_TOKEN environment variable is required")
    }
    this.baseUrl = BEDS24_API_URL
  }

  /**
   * Get stored token data from Firestore
   */
  private async getStoredToken(): Promise<TokenData | null> {
    try {
      const tokenRef = doc(db, "system", "beds24_token")
      const tokenDoc = await getDoc(tokenRef)

      if (!tokenDoc.exists()) {
        return null
      }

      const data = tokenDoc.data() as TokenData
      return data
    } catch (error) {
      console.error("Error getting stored token:", error)
      return null
    }
  }

  /**
   * Store token data in Firestore
   */
  private async storeToken(tokenData: TokenData): Promise<void> {
    try {
      const tokenRef = doc(db, "system", "beds24_token")
      await setDoc(tokenRef, tokenData)
      this.tokenData = tokenData
    } catch (error) {
      console.error("Error storing token:", error)
      throw error
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        console.log("Refreshing Beds24 access token...")

        const response = await fetch(`${this.baseUrl}/authentication/token`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            refreshToken: BEDS24_REFRESH_TOKEN!,
          },
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Token refresh failed: ${response.status} - ${error}`)
        }

        const data = await response.json()

        // Calculate expiration time (subtract 5 minutes for safety margin)
        const expiresAt = Date.now() + (data.expiresIn - 300) * 1000

        const tokenData: TokenData = {
          accessToken: data.token,
          expiresAt,
          refreshToken: BEDS24_REFRESH_TOKEN!,
        }

        await this.storeToken(tokenData)
        console.log("Access token refreshed successfully")
      } catch (error) {
        console.error("Error refreshing token:", error)
        throw error
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  private async getAccessToken(): Promise<string> {
    // Try to get cached token first
    if (!this.tokenData) {
      this.tokenData = await this.getStoredToken()
    }

    // Check if token exists and is still valid
    if (this.tokenData && this.tokenData.expiresAt > Date.now()) {
      return this.tokenData.accessToken
    }

    // Token expired or doesn't exist, refresh it
    await this.refreshAccessToken()

    if (!this.tokenData) {
      throw new Error("Failed to obtain access token")
    }

    return this.tokenData.accessToken
  }

  /**
   * Get stored write token data from Firestore
   */
  private async getStoredWriteToken(): Promise<WriteTokenData | null> {
    try {
      const tokenRef = doc(db, "system", "beds24_write_token")
      const tokenDoc = await getDoc(tokenRef)

      if (!tokenDoc.exists()) {
        return null
      }

      const data = tokenDoc.data() as WriteTokenData
      return data
    } catch (error) {
      console.error("Error getting stored write token:", error)
      return null
    }
  }

  /**
   * Store write token data in Firestore
   */
  private async storeWriteToken(tokenData: WriteTokenData): Promise<void> {
    try {
      const tokenRef = doc(db, "system", "beds24_write_token")
      await setDoc(tokenRef, tokenData)
      this.writeTokenData = tokenData
    } catch (error) {
      console.error("Error storing write token:", error)
      throw error
    }
  }

  /**
   * Get stored refresh token - checks Firestore first, then fallback to env var
   */
  private async getStoredRefreshToken(): Promise<string | null> {
    try {
      const tokenRef = doc(db, "settings", "beds24Token")
      const tokenDoc = await getDoc(tokenRef)
      
      if (tokenDoc.exists()) {
        const data = tokenDoc.data()
        return data.refreshToken
      }
      
      // Fallback to environment variable
      return BEDS24_REFRESH_TOKEN || null
    } catch (error) {
      console.error("[v0] Error getting stored refresh token:", error)
      return BEDS24_REFRESH_TOKEN || null
    }
  }

  /**
   * Refresh the write access token using the refresh token
   */
  private async refreshWriteToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getStoredRefreshToken()
        
        if (!refreshToken) {
          throw new Error("No refresh token available")
        }

        console.log("[v0] Refreshing Beds24 write access token...")
        console.log("[v0] Using refresh token:", refreshToken.substring(0, 10) + "...")

        const response = await fetch(`${this.baseUrl}/authentication/token`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "refreshToken": refreshToken,
          },
        })

        console.log("[v0] Token refresh response status:", response.status)

        if (!response.ok) {
          const error = await response.text()
          console.error("[v0] Token refresh error response:", error)
          throw new Error(`Write token refresh failed: ${response.status} - ${error}`)
        }

        const data = await response.json()
        console.log("[v0] Token refresh successful, expires in:", data.expiresIn, "seconds")

        // Calculate expiration time (subtract 5 minutes for safety margin)
        const expiresAt = Date.now() + (data.expiresIn - 300) * 1000

        const tokenData: WriteTokenData = {
          accessToken: data.token,
          expiresAt,
        }

        await this.storeWriteToken(tokenData)
        
        const tokenRef = doc(db, "settings", "beds24Token")
        const tokenDoc = await getDoc(tokenRef)
        if (tokenDoc.exists()) {
          await setDoc(tokenRef, {
            ...tokenDoc.data(),
            lastRefreshed: new Date().toISOString()
          })
        }
        
        console.log("[v0] Write access token refreshed and stored successfully")
      } catch (error) {
        console.error("[v0] Error refreshing write token:", error)
        throw error
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Get a valid write access token (refresh if needed)
   */
  private async getWriteToken(): Promise<string> {
    // Try to get cached token first
    if (!this.writeTokenData) {
      this.writeTokenData = await this.getStoredWriteToken()
    }

    // Check if token exists and is still valid
    if (this.writeTokenData && this.writeTokenData.expiresAt > Date.now()) {
      return this.writeTokenData.accessToken
    }

    // Token expired or doesn't exist, refresh it
    await this.refreshWriteToken()

    if (!this.writeTokenData) {
      throw new Error("Failed to obtain write access token")
    }

    return this.writeTokenData.accessToken
  }

  /**
   * Make an authenticated request to Beds24 API
   * Uses read token for GET requests, write token for other methods
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || "GET"

    const isReadOperation = method === "GET"
    let token: string

    if (isReadOperation) {
      token = BEDS24_READ_TOKEN!
    } else {
      token = await this.getWriteToken()
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        token,
        ...options.headers,
      },
    })

    if (response.status === 401 && !isReadOperation) {
      await this.refreshWriteToken()
      const newWriteToken = await this.getWriteToken()
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          token: newWriteToken,
          ...options.headers,
        },
      })

      if (!retryResponse.ok) {
        const error = await retryResponse.text()
        throw new Error(`Beds24 API Error: ${retryResponse.status} - ${error}`)
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Beds24 API Error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * Fetch all bookings from Beds24
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   * @param includeExtras - Include additional booking information like reviews
   */
  async getBookings(from?: string, to?: string, includeExtras = true): Promise<Beds24Booking[]> {
    const params = new URLSearchParams()

    if (from) params.append("checkInFrom", from)
    if (to) params.append("checkOutTo", to)

    params.append("limit", "100")

    if (includeExtras) {
      params.append("includeInvoice", "true")
      params.append("includeInfoItems", "true")
      params.append("includeGuestReviews", "true")
    }

    const endpoint = `/bookings?${params.toString()}`
    const response = await this.request<{ data: Beds24Booking[] }>(endpoint)
    return response.data || []
  }

  /**
   * Fetch bookings from Booking.com only (apiSourceId = 19)
   * Filters client-side since Beds24 API ignores apiSourceId parameter
   */
  async getBookingComBookings(from?: string, to?: string): Promise<Beds24Booking[]> {
    const allBookings = await this.getBookings(from, to, true)
    const bookingComBookings = allBookings.filter((booking) => booking.apiSourceId === 19)
    console.log(`[v0] Filtered ${bookingComBookings.length} Booking.com bookings from ${allBookings.length} total`)
    return bookingComBookings
  }

  /**
   * Fetch bookings from Airbnb only (apiSourceId = 10 for iCal, 46 for XML)
   * Filters client-side since Beds24 API ignores apiSourceId parameter
   */
  async getAirbnbBookings(from?: string, to?: string): Promise<Beds24Booking[]> {
    console.log("[v0] Fetching Airbnb bookings (iCal=10, XML=46)...")
    const allBookings = await this.getBookings(from, to, true)

    const airbnbBookings = allBookings.filter((booking) => booking.apiSourceId === 10 || booking.apiSourceId === 46)

    const icalCount = airbnbBookings.filter((b) => b.apiSourceId === 10).length
    const xmlCount = airbnbBookings.filter((b) => b.apiSourceId === 46).length

    console.log(
      `[v0] Filtered ${airbnbBookings.length} Airbnb bookings from ${allBookings.length} total (iCal: ${icalCount}, XML: ${xmlCount})`,
    )

    if (airbnbBookings.length === 0) {
      console.log("[v0] No Airbnb bookings found in Beds24. Make sure Airbnb is connected to your Beds24 account.")
    }

    return airbnbBookings
  }

  /**
   * Fetch a single booking by ID
   */
  async getBooking(bookingId: string): Promise<Beds24Booking> {
    const response = await this.request<{ data: Beds24Booking }>(`/bookings/${bookingId}`)
    return response.data
  }

  /**
   * Fetch reviews from Booking.com via Beds24 API
   * Requires BEDS24_PROPERTY_ID environment variable
   * @param limit - Maximum number of reviews to fetch (default: 50)
   */
  async getBookingComReviews(limit = 50): Promise<Beds24Review[]> {
    if (!BEDS24_PROPERTY_ID) {
      throw new Error(
        "BEDS24_PROPERTY_ID environment variable is required to fetch reviews. " +
          "Please add it in the Vars section of the v0 sidebar.",
      )
    }

    try {
      const params = new URLSearchParams({
        propertyId: BEDS24_PROPERTY_ID,
        from: "2015-01-01",
        to: "2100-12-31",
      })

      const endpoint = `/channels/booking/reviews?${params.toString()}`
      const response = await this.request<{ data: any[] }>(endpoint)

      console.log(`[v0] Retrieved ${response.data?.length || 0} raw reviews from Booking.com API`)

      const reviews: Beds24Review[] = []
      const data = response.data || []

      // Limit to requested number of reviews
      const limitedData = data.slice(0, limit)

      for (const item of limitedData) {
        let comment = ""
        if (item.content) {
          const positive = item.content.positive || ""
          const negative = item.content.negative || ""
          const headline = item.content.headline || ""

          // Combine headline, positive and negative comments
          const parts = []
          if (headline) parts.push(headline)
          if (positive) parts.push(positive)
          if (negative) parts.push(`Negativo: ${negative}`)

          comment = parts.join(" | ")
        }

        const rating = item.scoring?.review_score || item.rating || 5

        const guestName = item.reviewer?.name || item.guestName || "Guest"

        const date = item.created_timestamp
          ? item.created_timestamp.split(" ")[0] // Extract YYYY-MM-DD from "YYYY-MM-DD HH:MM:SS"
          : new Date().toISOString().split("T")[0]

        const responseText = item.reply?.text || undefined

        reviews.push({
          id: item.review_id || `booking_${item.reservation_id || Date.now()}_${Math.random()}`,
          bookingId: item.reservation_id?.toString() || "",
          roomId: item.roomId || item.propertyId || "",
          rating,
          comment,
          guestName,
          source: "booking",
          date,
          response: responseText,
        })
      }

      console.log(`[v0] Processed ${reviews.length} Booking.com reviews`)
      return reviews
    } catch (error) {
      console.error("Error fetching Booking.com reviews:", error)
      throw error
    }
  }

  /**
   * Fetch reviews from Airbnb via Beds24 API (beta)
   * Requires BEDS24_PROPERTY_ID environment variable
   * @param limit - Maximum number of reviews to fetch (default: 50)
   */
  async getAirbnbReviews(limit = 50): Promise<Beds24Review[]> {
    if (!BEDS24_PROPERTY_ID) {
      throw new Error(
        "BEDS24_PROPERTY_ID environment variable is required to fetch reviews. " +
          "Please add it in the Vars section of the v0 sidebar.",
      )
    }

    try {
      const params = new URLSearchParams({
        propertyId: BEDS24_PROPERTY_ID,
        from: "2015-01-01",
        to: "2100-12-31",
      })

      const endpoint = `/channels/airbnb/reviews?${params.toString()}`
      const response = await this.request<{ data: any[] }>(endpoint)

      const reviews: Beds24Review[] = []
      const data = response.data || []

      // Limit to requested number of reviews
      const limitedData = data.slice(0, limit)

      for (const item of limitedData) {
        reviews.push({
          id: item.id || `airbnb_${item.bookingId || Date.now()}`,
          bookingId: item.bookingId || "",
          roomId: item.roomId || "",
          rating: item.rating || item.score || 5,
          comment: item.comment || item.review || item.text || "",
          guestName: item.guestName || item.reviewerName || "Guest",
          source: "airbnb",
          date: item.date || item.reviewDate || new Date().toISOString().split("T")[0],
          response: item.response || item.hostResponse || undefined,
        })
      }

      return reviews
    } catch (error) {
      // Airbnb reviews API is in beta and may not be available for all properties
      console.log("Airbnb reviews not available (endpoint may not be supported)")
      return []
    }
  }

  /**
   * Fetch all reviews from both Booking.com and Airbnb
   * Maximum 50 reviews total (25 from each source)
   */
  async getReviews(): Promise<Beds24Review[]> {
    try {
      const [bookingReviews, airbnbReviews] = await Promise.all([
        this.getBookingComReviews(25),
        this.getAirbnbReviews(25),
      ])

      return [...bookingReviews, ...airbnbReviews]
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  }

  /**
   * Get all rooms from Beds24
   */
  async getRooms(): Promise<Beds24Room[]> {
    const response = await this.request<{ data: Beds24Room[] }>("/rooms")
    return response.data || []
  }

  /**
   * Block dates for a room (for maintenance or manual blocking)
   */
  async blockDates(roomId: string, from: string, to: string, reason = "maintenance"): Promise<void> {
    console.log("[v0] Blocking dates on Beds24:", { roomId, from, to, reason })
    
    try {
      await this.request("/bookings", {
        method: "POST",
        body: JSON.stringify([{
          roomId,
          arrival: from,
          departure: to,
          status: "blocked",
          notes: reason,
          firstName: "BLOCKED",
          lastName: reason.toUpperCase(),
        }]),
      })
      
      console.log("[v0] Successfully blocked dates on Beds24")
    } catch (error) {
      console.error("[v0] Error blocking dates on Beds24:", error)
      throw error
    }
  }

  /**
   * Unblock dates for a room
   */
  async unblockDates(blockingId: string): Promise<void> {
    await this.request(`/bookings/${blockingId}`, {
      method: "DELETE",
    })
  }

  /**
   * Manually refresh the access token (for testing or maintenance)
   */
  async forceRefreshToken(): Promise<void> {
    await this.refreshAccessToken()
  }

  /**
   * Manually refresh the write access token (for testing or maintenance)
   */
  async forceRefreshWriteToken(): Promise<void> {
    await this.refreshWriteToken()
  }
}

// Export singleton instance
export const beds24Client = new Beds24Client()
