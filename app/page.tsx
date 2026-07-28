import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { RoomsPreview } from "@/components/rooms-preview"
import { StorySection } from "@/components/story-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StorySection />
      <ServicesSection />
      <RoomsPreview />
      <Footer />
    </main>
  )
}
