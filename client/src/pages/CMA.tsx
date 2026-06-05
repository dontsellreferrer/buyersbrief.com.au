import { useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "../lib/trpc";
import fallbackCmaHtml from "./cma.html?raw";

function executeEmbeddedScript(html: string) {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return;

  try {
    // The supplied CMA report is a self-contained HTML renderer. The generated
    // report is archived as HTML and intentionally rehydrated here so the design
    // remains pixel-identical to the source template.
    // eslint-disable-next-line no-eval
    eval(scriptMatch[1]);
  } catch (error) {
    console.error("Error executing CMA script:", error);
  }
}

export default function CMA() {
  const [, twoPartParams] = useRoute("/cma/:suburbSlug/:addressSlug");
  const [, onePartParams] = useRoute("/cma/:property");

  const routeInput = useMemo(() => {
    if (twoPartParams?.suburbSlug && twoPartParams?.addressSlug) {
      return {
        suburbSlug: twoPartParams.suburbSlug,
        addressSlug: twoPartParams.addressSlug,
      };
    }

    if (onePartParams?.property) {
      return {
        suburbSlug: "property",
        addressSlug: onePartParams.property,
      };
    }

    return null;
  }, [onePartParams?.property, twoPartParams?.addressSlug, twoPartParams?.suburbSlug]);

  const cmaQuery = trpc.cma.bySlug.useQuery(
    routeInput || { suburbSlug: "property", addressSlug: "preview" },
    { enabled: Boolean(routeInput), retry: false },
  );

  const html = cmaQuery.data?.renderedHtml || fallbackCmaHtml;

  useEffect(() => {
    executeEmbeddedScript(html);
  }, [html]);

  if (routeInput && cmaQuery.isLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f4ee", color: "#17342d", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div>Loading CMA report…</div>
      </main>
    );
  }

  if (routeInput && cmaQuery.error) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f4ee", color: "#17342d", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
        <section style={{ maxWidth: 560, textAlign: "center" }}>
          <h1 style={{ marginBottom: 12 }}>CMA not found</h1>
          <p style={{ lineHeight: 1.6 }}>This CMA has not been generated yet, or the archived link is no longer available. Return to the dashboard hotlist and run the full CMA for this property.</p>
        </section>
      </main>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
