import { useState } from "react";
import PreferencesPanel from "@/components/PreferencesPanel";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import DetailsPanel from "@/components/DetailsPanel";
import { Place } from "@/types/place";

const Index = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [recommendations, setRecommendations] = useState<Place[]>([]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <PreferencesPanel onRecommendationsGenerated={setRecommendations} />
      <RecommendationsPanel 
        places={recommendations}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
      />
      <DetailsPanel place={selectedPlace} />
    </div>
  );
};

export default Index;
