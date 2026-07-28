# Beds24 Integration Setup

This document explains how to set up and use the Beds24 integration for syncing bookings and reviews from Airbnb and Booking.com.

## Environment Variables

Add these environment variables to your Vercel project:

\`\`\`env
BOOKING_API_URL=https://beds24.com/api/v2
BOOKING_API_KEY=your_beds24_api_key_here
\`\`\`

### Getting Your Beds24 API Key

1. Log in to your Beds24 account
2. Go to Settings → API
3. Generate a new API key
4. Copy the key and add it to your environment variables

## API Endpoints

### 1. Sync Bookings

**Endpoint:** `POST /api/beds24/sync-bookings`

Fetches bookings from Beds24 and syncs them to Firebase. Automatically prevents double bookings.

**Request Body:**
\`\`\`json
{
  "from": "2024-01-01",
  "to": "2024-12-31"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "synced": 15,
  "skipped": 3,
  "total": 18
}
\`\`\`

### 2. Sync Reviews

**Endpoint:** `POST /api/beds24/sync-reviews`

Fetches reviews from Airbnb and Booking.com via Beds24 and syncs them to Firebase.

**Response:**
\`\`\`json
{
  "success": true,
  "synced": 8,
  "skipped": 2,
  "total": 10
}
\`\`\`

### 3. Block Dates

**Endpoint:** `POST /api/beds24/block-dates`

Blocks dates on Beds24 (syncs to Airbnb and Booking.com) for maintenance or manual blocking.

**Request Body:**
\`\`\`json
{
  "roomId": "1",
  "from": "2024-06-15",
  "to": "2024-06-20",
  "reason": "maintenance"
}
\`\`\`

## How It Works

### Booking Sync Flow

1. **Fetch from Beds24**: The system fetches all bookings from Beds24 API
2. **Filter Sources**: Only bookings from Airbnb and Booking.com are processed
3. **Check Duplicates**: Checks if booking already exists in Firebase
4. **Sync to Firebase**: Saves new bookings to Firebase with proper formatting
5. **Auto-Block**: Bookings automatically block the room for those dates

### Review Sync Flow

1. **Fetch from Beds24**: Gets all reviews from Beds24 API
2. **Check Duplicates**: Verifies review doesn't already exist
3. **Sync to Firebase**: Saves reviews to Firebase reviews collection
4. **Display**: Reviews appear in the reviews section automatically

### Double Booking Prevention

The system prevents double bookings by:

1. **Checking existing bookings** before syncing
2. **Matching on**: checkIn, checkOut, roomId, and origin
3. **Priority system**: Beds24 bookings take priority over website bookings
4. **Real-time blocking**: Calendar updates immediately after sync

## Manual Sync

You can manually trigger syncs from the admin panel:

1. Go to Admin Dashboard
2. Navigate to Settings tab
3. Click "Sync Bookings from Beds24"
4. Click "Sync Reviews from Beds24"

## Automatic Sync (Recommended)

Set up a cron job or webhook to automatically sync bookings:

1. Use Vercel Cron Jobs to run sync every hour
2. Or set up Beds24 webhooks to push updates in real-time

### Example Cron Job (vercel.json)

\`\`\`json
{
  "crons": [
    {
      "path": "/api/beds24/sync-bookings",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/beds24/sync-reviews",
      "schedule": "0 0 * * *"
    }
  ]
}
\`\`\`

## Room ID Mapping

Update the room ID mapping in `/app/api/beds24/sync-bookings/route.ts`:

\`\`\`typescript
const roomMap: Record<string, string> = {
  '1': 'Camera Familiare con Balcone',
  '2': 'Camera Matrimoniale con Vasca Idromassaggio',
}
\`\`\`

Replace the keys with your actual Beds24 room IDs.

## Troubleshooting

### API Key Issues

- Verify your API key is correct
- Check that the API key has proper permissions in Beds24
- Ensure the environment variable is set in Vercel

### Sync Failures

- Check the Vercel logs for detailed error messages
- Verify your Beds24 account is active
- Ensure your rooms are properly configured in Beds24

### Missing Bookings

- Check the date range in your sync request
- Verify bookings exist in Beds24
- Check that bookings are from Airbnb or Booking.com (not direct)

## Support

For issues with:
- **Beds24 API**: Contact Beds24 support
- **Integration code**: Check Vercel logs and console errors
- **Firebase sync**: Verify Firebase permissions and rules
