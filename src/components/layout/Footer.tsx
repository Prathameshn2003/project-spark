import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, Phone } from "lucide-react";
import logoImg from "@/assets/logo.png";

const footerLinks = {
  product: [
    { name: "Features", path: "/modules" },
    { name: "Health Tracking", path: "/dashboard" },
    { name: "AI Chatbot", path: "/chatbot" },
    { name: "Find Doctors", path: "/doctors" },
  ],
  resources: [
    { name: "Health Education", path: "/education" },
    { name: "PCOS Guide", path: "/education/pcos" },
    { name: "Menopause Info", path: "/education/menopause" },
    { name: "Hygiene Tips", path: "/hygiene" },
  ],
  company: [
    { name: "About Us", path: "/about" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Terms of Service", path: "/terms" },
    { name: "Contact", path: "/contact" },
  ],
};

export const Footer = forwardRef<HTMLElement>((props, ref) => {
  return (
    <footer ref={ref} className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logoImg} alt="NaariCare Logo" className="w-10 h-10 rounded-xl object-contain" />
              <span className="font-heading font-bold text-xl text-foreground">
                Naari<span className="text-accent">Care</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              AI-powered women's health platform providing personalized insights, 
              predictions, and guidance for your wellness journey.
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="mailto:support@naaricare.com" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                support@naaricare.com
              </a>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +91 1800-XXX-XXXX
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 NaariCare. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-accent fill-current" />
            <span>for women's health</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
