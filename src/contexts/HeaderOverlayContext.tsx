import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface HeaderOverlayState {
  bannerImage: string | null;
  setBannerImage: (src: string | null) => void;
  activeSection: string | null;
  setActiveSection: (id: string | null) => void;
}

const HeaderOverlayContext = createContext<HeaderOverlayState | undefined>(undefined);

export function HeaderOverlayProvider({ children }: { children: ReactNode }) {
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const value = useMemo<HeaderOverlayState>(
    () => ({ bannerImage, setBannerImage, activeSection, setActiveSection }),
    [bannerImage, activeSection],
  );

  return <HeaderOverlayContext.Provider value={value}>{children}</HeaderOverlayContext.Provider>;
}

export function useHeaderOverlay(): HeaderOverlayState {
  const ctx = useContext(HeaderOverlayContext);
  if (!ctx) {
    // Permite uso fora do provider sem quebrar (ex.: rotas que não montam o provider).
    return {
      bannerImage: null,
      setBannerImage: () => {},
      activeSection: null,
      setActiveSection: () => {},
    };
  }
  return ctx;
}