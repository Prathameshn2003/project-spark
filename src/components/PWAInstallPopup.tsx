import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";

interface PWAInstallPopupProps {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAInstallPopup = memo(({ show, onInstall, onDismiss }: PWAInstallPopupProps) => {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onDismiss}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] p-4 sm:p-6"
          >
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-6 sm:right-8 p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="px-6 pb-6 pt-2">
                {/* Icon */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shrink-0">
                    <Smartphone className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Install NaariCare
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Women's Health Platform
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Install NaariCare for faster access, offline support, and a native app experience. 
                  It takes just a few seconds!
                </p>

                {/* Features */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {[
                    { icon: "⚡", label: "Faster" },
                    { icon: "📱", label: "Offline" },
                    { icon: "🔔", label: "Alerts" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-muted/50 text-center"
                    >
                      <span className="text-lg">{f.icon}</span>
                      <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onDismiss}
                  >
                    Maybe Later
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1 gap-2"
                    onClick={onInstall}
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

PWAInstallPopup.displayName = "PWAInstallPopup";
