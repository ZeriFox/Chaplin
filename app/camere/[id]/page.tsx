import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { RoomDetails } from "@/components/room-details"
import { RoomGallery } from "@/components/room-gallery"
import { BookingWidget } from "@/components/booking-widget"
import { normalizePublicRoomId } from "@/lib/room-identifiers"

interface RoomPageProps {
  params: {
    id: string
  }
}

export default function RoomPage({ params }: RoomPageProps) {
  const roomId = normalizePublicRoomId(params.id)

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-12">
            {/* Room Content */}
            <div className="lg:col-span-2">
              <RoomGallery roomId={roomId} />
              <RoomDetails roomId={roomId} />
            </div>

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <BookingWidget roomId={roomId} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
