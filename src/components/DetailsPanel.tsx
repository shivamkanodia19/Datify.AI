import { Place } from "@/types/place";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Navigation, Heart } from "lucide-react";

interface DetailsPanelProps {
  place: Place | null;
}

const DetailsPanel = ({ place }: DetailsPanelProps) => {
  if (!place) {
    return (
      <div className="w-96 bg-card/80 backdrop-blur-sm border-l border-border p-6 overflow-y-auto">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-center">Select a place to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-card/80 backdrop-blur-sm border-l border-border p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Place Details</h2>
          <Badge>{place.type}</Badge>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3">{place.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {place.description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Address:</p>
              <p className="text-sm text-muted-foreground">{place.address}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Highlights:</p>
          <div className="flex flex-wrap gap-2">
            {place.highlights.map((highlight, index) => (
              <Badge key={index} variant="secondary">
                {highlight}
              </Badge>
            ))}
          </div>
        </div>

        {(place.rating || place.userRating) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-rating fill-current" />
              <p className="text-sm font-medium text-foreground">User Ratings:</p>
            </div>
            {place.rating && (
              <p className="text-sm text-muted-foreground">
                Rating: {place.rating} out of 5
              </p>
            )}
            {place.userRating && (
              <p className="text-sm text-muted-foreground">{place.userRating}</p>
            )}
          </div>
        )}

        <div className="space-y-3 pt-4">
          <Button className="w-full" size="lg">
            <MapPin className="w-4 h-4 mr-2" />
            View on Map
          </Button>
          <Button variant="outline" className="w-full" size="lg">
            <Navigation className="w-4 h-4 mr-2" />
            Get Directions
          </Button>
          <Button variant="outline" className="w-full" size="lg">
            <Heart className="w-4 h-4 mr-2" />
            Save to Favorites
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Additional details and reviews will appear here
          </p>
        </div>
      </div>
    </div>
  );
};

export default DetailsPanel;
