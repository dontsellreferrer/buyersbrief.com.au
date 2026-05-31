import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import BriefIntake from "./pages/BriefIntake";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Partners from "./pages/Partners";
import Dashboard from "./pages/Dashboard";
import CMA from "./pages/CMA";

// Sample CMA data for preview
const sampleCMAData = {
  subject: { address: "2 Havilah Street, Morisset Park" },
  cma_id: "CMA-MORI-20260530",
  generated: "2026-05-30T04:15:00Z",
  valuation: { midpoint_display: "$850,000" }
};

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/brief"} component={BriefIntake} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      <Route path={"/partners"} component={Partners} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/cma/:property"} component={CMA} />
      <Route path={"/cma"} component={CMA} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
