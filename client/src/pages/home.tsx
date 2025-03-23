import { Video } from "lucide-react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="relative z-10 py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Video className="h-8 w-8 text-indigo-500" />
            <span className="ml-2 text-xl font-bold">WatchTogether</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <HeroSection />
      <FeaturesSection />

      {/* Footer */}
      <footer className="py-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Video className="h-6 w-6 text-indigo-500" />
              <span className="ml-2 text-lg font-bold">WatchTogether</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} WatchTogether. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
