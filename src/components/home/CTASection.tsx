import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logoImg from "@/assets/logo.png";

export const CTASection = forwardRef<HTMLElement>((props, ref) => {
  return (
    <section ref={ref} className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card shadow-glow mb-8">
            <Heart className="w-8 h-8 text-accent fill-current" />
          </div>

          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Start Your Wellness Journey Today
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of women taking control of their health with 
            AI-powered insights and personalized care.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button variant="hero" size="xl" className="group">
                Create Free Account
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="glass" size="xl">
                Learn More About Us
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free forever • Privacy guaranteed
          </p>
        </div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";
