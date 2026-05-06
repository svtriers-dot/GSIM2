import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Game from "@/pages/game";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Eula from "@/pages/Eula";
import Oferta from "@/pages/Oferta";
import Privacy from "@/pages/Privacy";

// Trainer mode (ADR-002)
import TrainerLogin from "@/pages/trainer/Login";
import TrainerDashboard from "@/pages/trainer/Dashboard";
import NewSession from "@/pages/trainer/NewSession";
import TrainerSession from "@/pages/trainer/Session";
import TrainerPending from "@/pages/trainer/Pending";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTrainers from "@/pages/admin/AdminTrainers";
import AdminSessions from "@/pages/admin/AdminSessions";

// Play (session-mode)
import PlayJoin from "@/pages/play/Join";
import PlayLobby from "@/pages/play/Lobby";
import PlaySessionGame from "@/pages/play/SessionGame";
import PlayResult from "@/pages/play/Result";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/play">{() => <Game />}</Route>
      <Route path="/play/join" component={PlayJoin} />
      <Route path="/play/lobby" component={PlayLobby} />
      <Route path="/play/session" component={PlaySessionGame} />
      <Route path="/play/result" component={PlayResult} />
      <Route path="/about" component={About} />
      <Route path="/legal/eula" component={Eula} />
      <Route path="/legal/oferta" component={Oferta} />
      <Route path="/legal/privacy" component={Privacy} />

      {/* Trainer */}
      <Route path="/trainer/login" component={TrainerLogin} />
      <Route path="/trainer" component={TrainerDashboard} />
      <Route path="/trainer/pending" component={TrainerPending} />
      <Route path="/trainer/sessions/new" component={NewSession} />
      <Route path="/trainer/sessions/:id" component={TrainerSession} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/trainers" component={AdminTrainers} />
      <Route path="/admin/sessions" component={AdminSessions} />

      <Route component={NotFound} />
    </Switch>
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
