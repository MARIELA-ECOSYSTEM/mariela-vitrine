import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

/**
 * Valida o contrato de redirecionamento das rotas legadas de categoria,
 * espelhando a configuração de `src/App.tsx`. Mantemos uma versão leve
 * aqui (sem providers globais) para isolar a lógica de routing.
 */
const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="probe" data-pathname={location.pathname} data-search={location.search}>
      {location.pathname}
      {location.search}
    </div>
  );
};

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/categoria/:slug"
          element={<RedirectCategoria />}
        />
        <Route
          path="/categorias/:slug"
          element={<RedirectCategoria />}
        />
        <Route path="/categorias" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

const RedirectCategoria = () => {
  const location = useLocation();
  const slug = location.pathname.split("/").pop() || "";
  return <Navigate to={`/products?categoria=${encodeURIComponent(slug)}`} replace />;
};

describe("Redirecionamentos de rotas antigas de categoria", () => {
  it("/categoria/:slug → /products?categoria=slug", async () => {
    renderAt("/categoria/vestidos");
    const probe = await screen.findByTestId("probe");
    expect(probe.getAttribute("data-pathname")).toBe("/products");
    expect(probe.getAttribute("data-search")).toBe("?categoria=vestidos");
  });

  it("/categorias/:slug → /products?categoria=slug", async () => {
    renderAt("/categorias/blusas");
    const probe = await screen.findByTestId("probe");
    expect(probe.getAttribute("data-pathname")).toBe("/products");
    expect(probe.getAttribute("data-search")).toBe("?categoria=blusas");
  });

  it("preserva slug com hífen", async () => {
    renderAt("/categoria/saia-midi");
    const probe = await screen.findByTestId("probe");
    expect(probe.getAttribute("data-pathname")).toBe("/products");
    expect(probe.getAttribute("data-search")).toBe("?categoria=saia-midi");
  });

  it("/categorias → /products (sem query)", async () => {
    renderAt("/categorias");
    const probe = await screen.findByTestId("probe");
    expect(probe.getAttribute("data-pathname")).toBe("/products");
    expect(probe.getAttribute("data-search")).toBe("");
  });
});