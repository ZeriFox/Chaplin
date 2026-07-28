# Firebase Database Structure

## Collections

### bookings
Stores all bookings from website, Booking.com, and Airbnb

\`\`\`json
{
  "id": "auto-generated",
  "checkIn": "2024-06-15",
  "checkOut": "2024-06-20",
  "guests": 2,
  "name": "Mario Rossi",
  "email": "mario@example.com",
  "phone": "+39 123 456 7890",
  "notes": "Late check-in requested",
  "totalAmount": 90000,
  "currency": "EUR",
  "status": "confirmed",
  "source": "site",
  "roomId": "1",
  "roomName": "Camera Familiare con Balcone",
  "createdAt": "2024-06-01T10:00:00Z"
}
\`\`\`

**Fields:**
- `checkIn` (string): Check-in date in YYYY-MM-DD format
- `checkOut` (string): Check-out date in YYYY-MM-DD format
- `guests` (number): Number of guests
- `name` (string): Guest full name
- `email` (string): Guest email
- `phone` (string): Guest phone number
- `notes` (string): Special requests or notes
- `totalAmount` (number): Total amount in cents (e.g., 90000 = €900.00)
- `currency` (string): Currency code (EUR)
- `status` (string): "pending" | "confirmed" | "cancelled"
- `source` (string): "site" | "booking" | "airbnb"
- `roomId` (string): Room ID ("1" or "2")
- `roomName` (string): Room name ("Camera Familiare con Balcone" or "Camera Matrimoniale con Vasca Idromassaggio")
- `createdAt` (timestamp): Booking creation timestamp

### rooms
Stores room status and information

\`\`\`json
{
  "id": "1",
  "name": "Camera Familiare con Balcone",
  "status": "available",
  "price": 180,
  "capacity": 4,
  "description": "Camera matrimoniale e balcone privato",
  "amenities": ["WiFi gratuito", "Balcone privato", "Vista mare"]
}
\`\`\`

**Fields:**
- `id` (string): Room ID ("1" or "2")
- `name` (string): Room name
- `status` (string): "available" | "booked" | "maintenance"
- `price` (number): Price per night in EUR
- `capacity` (number): Maximum number of guests
- `description` (string): Room description
- `amenities` (array): List of amenities

## Booking Priority System

When checking availability, the system respects this priority order:
1. **Booking.com** (highest priority)
2. **Airbnb** (medium priority)
3. **Website** (lowest priority)

If a room is booked from Booking.com or Airbnb, it automatically blocks that room for those dates on the website.

## How to Add Bookings from Booking.com/Airbnb

To manually add bookings from external platforms:

1. Go to Firebase Console → Firestore Database
2. Select the `bookings` collection
3. Click "Add document"
4. Fill in the fields:
   - **checkIn**: "2024-06-15"
   - **checkOut**: "2024-06-20"
   - **guests**: 2
   - **name**: "Guest Name"
   - **email**: "guest@example.com"
   - **phone**: "+39 123 456 7890"
   - **notes**: ""
   - **totalAmount**: 90000
   - **currency**: "EUR"
   - **status**: "confirmed"
   - **source**: "booking" (or "airbnb")
   - **roomId**: "1" (or "2")
   - **roomName**: "Camera Familiare con Balcone" (or "Camera Matrimoniale con Vasca Idromassaggio")
   - **createdAt**: (use server timestamp)

The system will automatically:
- Show the booking in the admin calendar
- Block that room for those dates
- Display the guest information in the guests tracking section
- Prevent double bookings on the website
