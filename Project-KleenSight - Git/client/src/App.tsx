import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Salespeople from "@/pages/salespeople";
import SalespersonDetails from "@/pages/salesperson-details";
import Parameters from "@/pages/parameters";
import LeadAssignment from "@/pages/lead-assignment";
import AssignmentHistory from "@/pages/assignment-history";
import NaceList from "@/pages/nace-list";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

function Router() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/salespeople" component={Salespeople} />
            <Route path="/salespeople/:id" component={SalespersonDetails} />
            <Route path="/parameters" component={Parameters} />
            <Route path="/lead-assignment" component={LeadAssignment} />
            <Route path="/assignment-history" component={AssignmentHistory} />
            <Route path="/nace-list" component={NaceList} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
