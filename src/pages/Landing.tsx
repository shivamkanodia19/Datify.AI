import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Users, MapPin, Sparkles } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(200,90%,95%)] via-[hsl(320,80%,95%)] to-[hsl(340,80%,95%)]" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="mb-8 inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-12 h-12 text-primary fill-primary animate-pulse" />
              <h1 className="text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Dateify
              </h1>
            </div>
          </div>
          
          <p className="text-2xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Find the perfect date spot together. Swipe, match, and discover places you'll both love.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-2"
              onClick={() => navigate("/auth")}
            >
              Login
            </Button>
            <Button 
              size="lg" 
              variant="ghost" 
              className="text-lg px-8 py-6"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                1000+
              </div>
              <p className="text-foreground/70">Places to Discover</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                100%
              </div>
              <p className="text-foreground/70">Match Accuracy</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                ∞
              </div>
              <p className="text-foreground/70">Perfect Dates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-center text-foreground/70 mb-16 text-lg">
            Finding the perfect date spot has never been easier
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Create or Join</h3>
              <p className="text-foreground/70">
                Start a session or join your partner's session with a simple code
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Swipe Together</h3>
              <p className="text-foreground/70">
                Both of you swipe on personalized recommendations based on your preferences
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Find Matches</h3>
              <p className="text-foreground/70">
                Instantly discover places you both liked and make your plans
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[hsl(200,90%,95%)] via-[hsl(320,80%,95%)] to-[hsl(340,80%,95%)]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Ready to Find Your Perfect Date Spot?
          </h2>
          <p className="text-xl text-foreground/70 mb-8">
            Join thousands of couples making better date decisions together
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
            onClick={() => navigate("/auth?mode=signup")}
          >
            Start Swiping
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t">
        <div className="max-w-6xl mx-auto px-4 text-center text-foreground/60">
          <p>© 2024 Dateify. Making date planning magical.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
