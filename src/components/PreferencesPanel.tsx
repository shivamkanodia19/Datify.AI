import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Activity, UtensilsCrossed } from "lucide-react";
import { Place } from "@/types/place";
import { toast } from "sonner";

interface PreferencesPanelProps {
  onRecommendationsGenerated: (places: Place[]) => void;
}

const PreferencesPanel = ({ onRecommendationsGenerated }: PreferencesPanelProps) => {
  const [startAddress, setStartAddress] = useState("");
  const [location, setLocation] = useState("");
  const [activities, setActivities] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");

  const handleGenerate = async () => {
    if (!startAddress || !location) {
      toast.error("Please enter at least a starting address and location");
      return;
    }

    // Enhanced mock recommendations based on user preferences
    const mockPlaces: Place[] = [
      {
        id: "1",
        name: "The Garden Bistro",
        type: "Restaurant",
        rating: 4.7,
        description: "Farm-to-table restaurant featuring seasonal menus with locally sourced ingredients. Known for their creative vegetarian options and craft cocktails.",
        address: `123 Main Street, ${location}`,
        highlights: ["Farm-to-table", "Seasonal menu", "Craft cocktails"],
        lat: 33.0145,
        lng: -97.0969
      },
      {
        id: "2",
        name: "Sakura Sushi & Ramen",
        type: "Restaurant",
        rating: 4.5,
        description: "Authentic Japanese cuisine with fresh sushi rolls and rich ramen bowls. Family-owned with a cozy atmosphere.",
        address: `456 Oak Avenue, ${location}`,
        highlights: ["Fresh sushi", "Authentic ramen", "Family-owned"],
        lat: 33.0167,
        lng: -97.0985
      },
      {
        id: "3",
        name: "Riverside Trail Park",
        type: "Outdoor Activity",
        rating: 4.8,
        description: "Beautiful park along the river with well-maintained walking trails, picnic areas, and stunning sunset views.",
        address: `789 River Road, ${location}`,
        highlights: ["Scenic trails", "Picnic areas", "Sunset views"],
        lat: 33.0189,
        lng: -97.1001
      },
      {
        id: "4",
        name: "Local Art Museum",
        type: "Cultural Activity",
        rating: 4.6,
        description: "Contemporary art museum featuring rotating exhibitions from local and international artists. Free admission on Thursdays.",
        address: `321 Culture Drive, ${location}`,
        highlights: ["Contemporary art", "Rotating exhibits", "Free Thursdays"],
        lat: 33.0134,
        lng: -97.0947
      },
      {
        id: "5",
        name: "Mountain View Cafe",
        type: "Restaurant",
        rating: 4.4,
        description: "Casual cafe with panoramic views, serving brunch favorites and specialty coffee. Pet-friendly patio available.",
        address: `555 Hill Street, ${location}`,
        highlights: ["Brunch favorites", "Specialty coffee", "Pet-friendly"],
        lat: 33.0201,
        lng: -97.1015
      },
      {
        id: "6",
        name: "Adventure Climbing Gym",
        type: "Outdoor Activity",
        rating: 4.7,
        description: "Indoor rock climbing facility with routes for all skill levels. Offers classes and equipment rental.",
        address: `888 Fitness Way, ${location}`,
        highlights: ["All skill levels", "Classes available", "Equipment rental"],
        lat: 33.0178,
        lng: -97.0993
      }
    ];

    onRecommendationsGenerated(mockPlaces);
    toast.success("Recommendations generated!");
  };

  return (
    <div className="w-80 bg-card border-r border-border p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Local Guide</h2>
          <p className="text-sm text-muted-foreground">Find personalized recommendations</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Start Address
            </Label>
            <Input
              id="address"
              placeholder="Enter your starting address"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Enter your starting location or address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Flower Mound, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Search destination location for results
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activities" className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Preferences
            </Label>
            <Textarea
              id="activities"
              placeholder="e.g., hiking, museums, shopping"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              className="bg-background min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Describe your preferred activities
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="food" className="text-sm font-medium flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Food Preferences
            </Label>
            <Textarea
              id="food"
              placeholder="e.g., Italian, vegetarian, spicy food"
              value={foodPreferences}
              onChange={(e) => setFoodPreferences(e.target.value)}
              className="bg-background min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Describe your preferred food types
            </p>
          </div>

          <Button 
            onClick={handleGenerate}
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            size="lg"
          >
            Generate Recommendations
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel;
