// web/src/App.tsx
// Composes the landing page sections in archive order.
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import FeaturesSection from "./components/FeaturesSection";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <Footer />
    </>
  );
}
