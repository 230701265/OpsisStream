import { cn } from "@/lib/utils";

interface SkipLinksProps {
  className?: string;
}

export function SkipLinks({ className }: SkipLinksProps) {
  return (
    <div className={cn("skip-links", className)}>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 transition-all"
        data-testid="skip-main-content"
      >
        Skip to main content
      </a>
      <a 
        href="#navigation" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 transition-all"
        data-testid="skip-navigation"
      >
        Skip to navigation
      </a>
      <a 
        href="#accessibility-toolbar" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-80 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 transition-all"
        data-testid="skip-accessibility-toolbar"
      >
        Skip to accessibility tools
      </a>
    </div>
  );
}