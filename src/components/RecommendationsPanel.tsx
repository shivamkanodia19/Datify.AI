import { Place } from "@/types/place";
import PlaceCard from "./PlaceCard";

interface RecommendationsPanelProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
}

const RecommendationsPanel = ({ places, selectedPlace, onSelectPlace }: RecommendationsPanelProps) => {
  return (
    <div className="flex-1 bg-background p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Recommended Places</h2>
          <p className="text-sm text-muted-foreground">Based on your preferences</p>
        </div>

        {places.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Enter your preferences and generate recommendations to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isSelected={selectedPlace?.id === place.id}
                onClick={() => onSelectPlace(place)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPanel;
