import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseAuth } from "@/components/auth/FirebaseAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Exams from "@/pages/exams";
import Results from "@/pages/results";
import Help from "@/pages/help";
import ExamTaking from "@/pages/exam-taking";
import ExamAuthoring from "@/pages/exam-authoring";
import AccessibilitySettings from "@/pages/accessibility-settings";
import Admin from "@/pages/admin";
import Invite from "@/pages/invite";
import Setup from "@/pages/setup";
import VoiceCommandsHelp from "@/pages/voice-commands-help";
import VoiceTest from "@/pages/voice-test";

function Router() {
  const { isAuthenticated, isLoading, firebaseUser } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!firebaseUser ? (
        <>
          <Route path="/" component={FirebaseAuth} />
          <Route path="/invite/:token" component={Invite} />
          <Route path="/setup/:token" component={Setup} />
          <Route path="/accessibility-settings" component={AccessibilitySettings} />
          <Route path="/voice-commands-help" component={VoiceCommandsHelp} />
          <Route path="/voice-test" component={VoiceTest} />
        </>
      ) : isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/exams" component={Exams} />
          <Route path="/results" component={Results} />
          <Route path="/help" component={Help} />
          <Route path="/exam/:examId" component={ExamTaking} />
          <Route path="/exam/:examId/attempt/:attemptId" component={ExamTaking} />
          <Route path="/exam-authoring" component={ExamAuthoring} />
          <Route path="/exam-authoring/:examId" component={ExamAuthoring} />
          <Route path="/admin" component={Admin} />
          <Route path="/accessibility-settings" component={AccessibilitySettings} />
          <Route path="/voice-commands-help" component={VoiceCommandsHelp} />
          <Route path="/voice-test" component={VoiceTest} />
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up your account...</p>
          </div>
        </div>
      )}
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
