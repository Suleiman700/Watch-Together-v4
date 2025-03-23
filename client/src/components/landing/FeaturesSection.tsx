import { Card, CardContent } from "@/components/ui/card";
import { Plus, PlaySquare, MessageSquare } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeaturesSection() {
  const features: Feature[] = [
    {
      icon: <Plus className="h-6 w-6 text-indigo-500" />,
      title: "Create a Room",
      description: "Generate a unique room with one click and invite your friends to join using a simple code."
    },
    {
      icon: <PlaySquare className="h-6 w-6 text-indigo-500" />,
      title: "Add a Video",
      description: "Paste a video link from popular platforms and everyone in the room will watch in perfect sync."
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-indigo-500" />,
      title: "Chat & Watch",
      description: "Chat with your friends in real-time while enjoying your favorite movies and shows together."
    }
  ];
  
  return (
    <div className="py-16 bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            WatchTogether makes it easy to enjoy movies with friends and family, no matter where they are.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
