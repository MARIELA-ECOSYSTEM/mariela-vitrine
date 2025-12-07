import { Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-serif text-2xl font-bold text-primary mb-2">
                Mariela
              </h3>
              <p className="text-muted-foreground text-sm">
                Moda feminina com elegância
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <a 
                href="https://www.instagram.com/marielaloja_/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
                <span className="text-sm font-medium">@marielaloja_</span>
              </a>
            </div>

            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm">
                © {new Date().getFullYear()} Mariela
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
