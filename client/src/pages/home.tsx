import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  HelpCircle,
  Home as HomeIcon,
  ClipboardList,
  BarChart3,
  Play,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

interface Exam {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  published: boolean;
  createdAt: string;
}

interface Attempt {
  id: string;
  examId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt?: string;
  score?: number;
}

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { announceForScreenReader } = useAccessibility();

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["/api/exams"],
    enabled: !!user,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ["/api/user/attempts"],
    enabled: !!user,
  });

  // Announce page load for screen readers - MUST be before any conditional returns
  useEffect(() => {
    if (user && !authLoading) {
      announceForScreenReader('Dashboard loaded. Welcome to OPSIS exam platform.');
    }
  }, [announceForScreenReader, user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This should be handled by the router
  }

  const upcomingExams = (exams as Exam[])?.filter((exam: Exam) => exam.published) || [];
  const recentAttempts = (attempts as Attempt[])?.slice(0, 3) || [];
  const completedAttempts = (attempts as Attempt[])?.filter((attempt: Attempt) => attempt.status === 'graded') || [];
  const averageScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((sum: number, attempt: Attempt) => sum + (attempt.score || 0), 0) / completedAttempts.length)
    : 0;

  const activeAttempt = (attempts as Attempt[])?.find((attempt: Attempt) => attempt.status === 'in_progress');

  return (
    <AppLayout 
      title="Dashboard"
      description={`Welcome to OSIS dashboard. You have ${upcomingExams.length} available exams${activeAttempt ? ' and 1 exam in progress' : ''}.`}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, <span data-testid="text-welcome-name">{(user as any)?.firstName}</span>. Here's what's happening with your exams.
        </p>
      </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Upcoming Exams */}
            <Card data-testid="card-upcoming-exams">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Available Exams</h2>
                    <p className="text-3xl font-bold text-primary" data-testid="text-exam-count">
                      {upcomingExams.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {upcomingExams.length > 0 ? 'Ready to take' : 'No exams available'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                {upcomingExams.length > 0 && (
                  <div className="mt-4">
                    <Link href="/exams">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-view-exams">
                        View all exams →
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card data-testid="card-results">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Average Score</h2>
                    <p className="text-3xl font-bold text-success" data-testid="text-average-score">
                      {completedAttempts.length > 0 ? `${averageScore}%` : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      From {completedAttempts.length} exam{completedAttempts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-success" aria-hidden="true" />
                  </div>
                </div>
                {completedAttempts.length > 0 && (
                  <div className="mt-4">
                    <Link href="/results">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-view-results">
                        View detailed results →
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accessibility Status */}
            <Card data-testid="card-accessibility">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Accessibility</h2>
                    <p className="text-sm text-success mb-1">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-success rounded-full mr-2" aria-hidden="true"></span>
                        Optimized
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      TTS ready, Voice enabled
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/accessibility-settings">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-accessibility-settings">
                      Adjust settings →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Exam Alert */}
          {activeAttempt && (
            <Card className="mb-8 border-warning bg-warning/5" data-testid="card-active-exam">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-warning">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  <span>Exam In Progress</span>
                </CardTitle>
                <CardDescription>
                  You have an active exam that needs to be completed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Started: {new Date(activeAttempt.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/exam/${activeAttempt.examId}/attempt/${activeAttempt.id}`}>
                    <Button className="bg-warning text-warning-foreground hover:bg-warning/90" data-testid="button-continue-exam">
                      <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                      Continue Exam
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Exams */}
          {upcomingExams.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Available Exams</h2>
                <Link href="/exams">
                  <Button variant="outline" size="sm" data-testid="button-view-all-exams">
                    View All Exams
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                {upcomingExams.slice(0, 3).map((exam: Exam) => (
                  <Card key={exam.id} data-testid={`card-exam-${exam.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{exam.title}</h3>
                            <Badge variant="secondary">Available</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{exam.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" aria-hidden="true" />
                              <span>{exam.timeLimit} minutes</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-6">
                          <Link href={`/exam/${exam.id}`}>
                            <Button data-testid={`button-start-exam-${exam.id}`}>
                              Start Exam
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          {recentAttempts.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentAttempts.map((attempt: Attempt, index: number) => (
                      <div key={attempt.id} className="p-4 flex items-center space-x-4" data-testid={`activity-${attempt.id}`}>
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {attempt.status === 'graded' ? 'Completed' : 
                             attempt.status === 'submitted' ? 'Submitted' : 'Started'} exam
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.startedAt).toLocaleDateString()} • 
                            {attempt.score && ` Score: ${Math.round(attempt.score)}%`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Empty State */}
          {upcomingExams.length === 0 && recentAttempts.length === 0 && (
            <Card className="text-center py-12" data-testid="card-empty-state">
              <CardContent>
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Exams Available</h3>
                <p className="text-muted-foreground mb-4">
                  Check back later for new exams or contact your instructor.
                </p>
              </CardContent>
            </Card>
          )}
    </AppLayout>
  );
}
