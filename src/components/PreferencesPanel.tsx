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
  const [apiKey, setApiKey] = useState("");

  const handleGenerate = async () => {
    if (!startAddress || !location) {
      toast.error("Please enter at least a starting address and location");
      return;
    }

    if (!apiKey) {
      toast.error("Please enter your Google Maps API key");
      return;
    }

    // Mock recommendations for now - will be replaced with real Google Places API calls
    const mockPlaces: Place[] = [
      {
        id: "1",
        name: "Ista Indian Cuisine",
        type: "Restaurant",
        description: "Praised for authentic Indian food with fused flavors and a diverse menu, including many vegetarian options. Their lunch buffet is a popular choice for perfectly prepared dishes.",
        address: "2221 Cross Timbers Rd, Ste 105, Flower Mound, TX 75028",
        highlights: ["Authentic flavors", "diverse menu", "vegetarian options"],
        userRating: "Not provided, but highly praised"
      },
      {
        id: "2",
        name: "Cafe India",
        type: "Restaurant",
        rating: 4.5,
        description: "A beloved local spot offering traditional recipes with family-friendly outdoor seating.",
        address: "1234 Main Street, Flower Mound, TX",
        highlights: ["Traditional recipes", "family-friendly", "outdoor seating"]
      },
      {
        id: "3",
        name: "Riverside Trail Park",
        type: "Outdoor Activity",
        rating: 4.8,
        description: "Beautiful park along the river with well-maintained walking trails and picnic areas.",
        address: "5678 River Road, Flower Mound, TX",
        highlights: ["Scenic views", "walking trails", "picnic areas"]
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
            <Label htmlFor="apiKey" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Google Maps API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
          </div>

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
