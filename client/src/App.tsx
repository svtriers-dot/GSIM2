import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { SkeletonCard } from "@/components/Skeleton";

// Eager: лендинг, юр.страницы, login, простые экраны
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Eula from "@/pages/Eula";
import Oferta from "@/pages/Oferta";
import Privacy from "@/pages/Privacy";
import TrainerLogin from "@/pages/trainer/Login";
import TrainerPending from "@/pages/trainer/Pending";
import PlayJoin from "@/pages/play/Join";
import PlayLobby from "@/pages/play/Lobby";
import PlayResult from "@/pages/play/Result";

// Lazy: тяжёлые страницы, отдельные chunks
const Game = lazy(() => import("@/pages/game"));
const PlaySessionGame = lazy(() => import("@/pages/play/SessionGame"));
const TrainerDashboard = lazy(() => import("@/pages/trainer/Dashboard"));
const NewSession = lazy(() => import("@/pages/trainer/NewSession"));
const TrainerSession = lazy(() => import("@/pages/trainer/Session"));
const TrainerReplay = lazy(() => import("@/pages/trainer/Replay"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminTrainers = lazy(() => import("@/pages/admin/AdminTrainers"));
const AdminSessions = lazy(() => import("@/pages/admin/AdminSessions"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl">
        <SkeletonCard />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
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
        <Route path="/trainer/sessions/:sessionId/replay/:teamId" component={TrainerReplay} />

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/trainers" component={AdminTrainers} />
        <Route path="/admin/sessions" component={AdminSessions} />
        <Route path="/admin/audit-log" component={AdminAuditLog} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConfirmDialogProvider>
            <Toaster />
            <Router />
          </ConfirmDialogProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
