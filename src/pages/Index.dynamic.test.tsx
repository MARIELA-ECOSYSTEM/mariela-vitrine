 import { describe, it, expect, vi, beforeEach } from "vitest";
 import { render, screen, waitFor } from "@testing-library/react";
 import { MemoryRouter } from "react-router-dom";
 import Index from "./Index";
 import { vitrineApiService } from "@/services/vitrineApiService";
 
 // Mock components to simplify testing
 vi.mock("@/components/Header", () => ({ Header: () => <div data-testid="header" /> }));
 vi.mock("@/components/HeroBannerCarousel", () => ({ HeroBannerCarousel: () => <div data-testid="hero" /> }));
 vi.mock("@/components/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
 vi.mock("@/components/WelcomeDialog", () => ({ WelcomeDialog: () => <div data-testid="welcome-dialog" /> }));
 vi.mock("@/components/LoadingOverlay", () => ({ LoadingOverlay: () => <div data-testid="loading-overlay" /> }));
 vi.mock("@/components/QuickActions", () => ({ QuickActions: () => <div data-testid="quick-actions" /> }));
 
 // Mock vitrineApiService
 vi.mock("@/services/vitrineApiService", async () => {
   const actual = await vi.importActual("@/services/vitrineApiService");
   return {
     ...actual,
     vitrineApiService: {
       getHomeBlocks: vi.fn().mockImplementation(async () => []),
       getConfig: vi.fn().mockResolvedValue({
         nomeLoja: "Mariela Teste",
         logoUrl: null,
         whatsapp: "5583999999999",
         instagram: "mariela",
       }),
       getProdutos: vi.fn().mockResolvedValue([]),
     },
   };
 });
 
 describe("Index Dynamic Blocks", () => {
   beforeEach(() => {
     vi.clearAllMocks();
   });
 
   it("renders dynamic blocks from API", async () => {
     const mockBlocks = [
       {
         id: "block-1",
         tipo: "produtos",
         titulo: "Bloco Dinâmico 1",
         prioridade: 1,
         config: { filter: "novidades", limit: 4 },
       },
     ];
     (vitrineApiService.getHomeBlocks as any).mockResolvedValue([...mockBlocks].sort((a, b) => a.prioridade - b.prioridade));
 
     render(
       <MemoryRouter>
         <Index />
       </MemoryRouter>
     );
 
     await waitFor(() => {
       expect(screen.getByText("Bloco Dinâmico 1")).toBeInTheDocument();
     });
   });
 
   it("respects block priority", async () => {
     const mockBlocks = [
       {
         id: "block-later",
         tipo: "produtos",
         titulo: "Segundo Bloco",
         prioridade: 20,
         config: { filter: "promocoes" },
       },
       {
         id: "block-first",
         tipo: "produtos",
         titulo: "Primeiro Bloco",
         prioridade: 10,
         config: { filter: "novidades" },
       },
     ];
     (vitrineApiService.getHomeBlocks as any).mockResolvedValue([...mockBlocks].sort((a, b) => a.prioridade - b.prioridade));
 
     render(
       <MemoryRouter>
         <Index />
       </MemoryRouter>
     );
 
     await waitFor(() => {
       const titles = screen.getAllByRole("heading", { level: 2 });
       // Filter titles to only include our dynamic blocks
       const blockTitles = titles
         .map(t => t.textContent)
         .filter(t => t === "Primeiro Bloco" || t === "Segundo Bloco");
       
       expect(blockTitles[0]).toBe("Primeiro Bloco");
       expect(blockTitles[1]).toBe("Segundo Bloco");
     });
   });
 
   it("handles empty blocks gracefully", async () => {
     (vitrineApiService.getHomeBlocks as any).mockResolvedValue([]);
 
     render(
       <MemoryRouter>
         <Index />
       </MemoryRouter>
     );
 
     await waitFor(() => {
       expect(screen.getByText("Em breve, novidades por aqui")).toBeInTheDocument();
     });
   });
 
   it("shows debug info when ?debugHome=1 is present (DEV only)", async () => {
     const mockBlocks = [
       {
         id: "debug-test-block",
         tipo: "produtos",
         titulo: "Debug Block",
         prioridade: 1,
         config: { filter: "novidades" },
       },
     ];
     (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);
 
     // Mock import.meta.env.DEV as true
     vi.stubGlobal("import.meta", { env: { DEV: true } });
 
     render(
       <MemoryRouter initialEntries={["/?debugHome=1"]}>
         <Index />
       </MemoryRouter>
     );
 
     await waitFor(() => {
       expect(screen.getByText(/\[DEBUG\] ID: debug-test-block/)).toBeInTheDocument();
     });
   });
 });
 