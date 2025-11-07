import { Place } from "@/types/place";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  onClick: () => void;
}

const PlaceCard = ({ place, isSelected, onClick }: PlaceCardProps) => {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        isSelected && "border-primary border-2 bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground">{place.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {place.type}
              </Badge>
            </div>
            {place.rating && (
              <div className="flex items-center gap-1 text-rating">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-semibold">{place.rating}</span>
              </div>
            )}
            {!place.rating && place.userRating && (
              <div className="flex items-center gap-1 text-rating">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">Not</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {place.description}
          </p>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{place.address}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {place.highlights.slice(0, 3).map((highlight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PlaceCard;
