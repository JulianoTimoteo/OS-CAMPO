import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { routeTree } from "../src/routeTree.gen";
import "../src/styles.css";

// Base do GitHub Pages ("/OS-CAMPO/") sem a barra final, para o basepath do router.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const router = createRouter({
  routeTree,
  basepath,
  context: { queryClient: new QueryClient() },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
