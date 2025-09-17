import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/app-layout';
import type { User, Attempt, Exam } from '@shared/schema';
import { 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Calendar, 
  Award,
  Target,
  BarChart3,
  Search,
  Filter,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';

interface ExamWithDetails extends Exam {
  questionCount?: number;
  averageScore?: number;
}

interface AttemptWithExam extends Attempt {
  exam: ExamWithDetails;
}

export default function Results() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = authUser as User;
  const { announceForScreenReader } = useAccessibility();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'submitted' | 'in_progress'>('all');

  const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin';

  // For instructors/admins: get results from their exams
  // For students: get their own attempts
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: isInstructorOrAdmin ? ['/api/exams/results'] : ['/api/user/attempts'],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/user/stats'],
    enabled: !!user,
  });

  useEffect(() => {
    const message = isInstructorOrAdmin 
      ? 'Results page loaded. View student performance across your exams and analytics.'
      : 'Results page loaded. View your exam performance and detailed statistics.';
    announceForScreenReader(message);
  }, [announceForScreenReader, isInstructorOrAdmin]);

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
    return null;
  }

  const attemptsList = (attempts as AttemptWithExam[]) || [];
  const defaultStats = { 
    totalAttempts: 0, 
    averageScore: 0, 
    completedExams: 0, 
    timeSpent: 0,
    totalExams: 0,
    totalStudents: 0,
    publishedExams: 0,
    role: 'student' as const
  };
  const userStats = (stats as typeof defaultStats) || defaultStats;
  const isLoading = attemptsLoading || statsLoading;

  // Filter attempts based on search and filters
  const filteredAttempts = attemptsList.filter(attempt => {
    const matchesSearch = attempt.exam?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         attempt.exam?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus !== 'all' && attempt.status !== filterStatus) return false;
    
    if (filterPeriod !== 'all') {
      const attemptDate = new Date(attempt.startedAt);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - (parseInt(filterPeriod) * 24 * 60 * 60 * 1000));
      if (attemptDate < daysAgo) return false;
    }
    
    return true;
  });

  const gradedAttempts = attemptsList.filter(a => a.status === 'graded' && a.score !== null);
  const recentAttempts = attemptsList
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusBadge = (attempt: Attempt) => {
    switch (attempt.status) {
      case 'graded':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const averageScore = gradedAttempts.length > 0
    ? gradedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / gradedAttempts.length
    : 0;

  return (
    <AppLayout 
      title={isInstructorOrAdmin ? "Student Results & Analytics" : "Results"}
      description={isInstructorOrAdmin 
        ? `Analytics dashboard loaded. Overview of student performance across your ${userStats.totalExams || 0} exams.`
        : `Results page loaded. You have ${filteredAttempts.length} exam results${filteredAttempts.length > 0 ? ` with an average score of ${Math.round(averageScore)}%` : ''}.`
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isInstructorOrAdmin ? "Student Results & Analytics" : "Exam Results"}
            </h1>
            <p className="text-muted-foreground">
              {isInstructorOrAdmin 
                ? "Monitor student performance across your exams and gain insights into learning outcomes."
                : "Track your performance and view detailed exam results."
              }
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Exam History</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-muted rounded mb-2"></div>
                        <div className="h-8 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isInstructorOrAdmin ? "Total Exams" : "Total Attempts"}
                          </p>
                          <p className="text-2xl font-bold">
                            {isInstructorOrAdmin ? (userStats.totalExams || 0) : (userStats.totalAttempts || 0)}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {isInstructorOrAdmin ? "Exams you've created" : "Across all exams"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-2xl font-bold">{Math.round(userStats.averageScore || 0)}%</p>
                            <Badge variant="secondary" className={getScoreColor(userStats.averageScore || 0)}>
                              {(userStats.averageScore || 0) >= 90 ? 'Excellent' :
                               (userStats.averageScore || 0) >= 70 ? 'Good' :
                               (userStats.averageScore || 0) >= 60 ? 'Fair' : 'Needs Improvement'}
                            </Badge>
                          </div>
                        </div>
                        <Target className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="mt-2">
                        <Progress value={userStats.averageScore || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {isInstructorOrAdmin ? "Across all students" : "From graded attempts"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isInstructorOrAdmin ? "Total Students" : "Completed Exams"}
                          </p>
                          <p className="text-2xl font-bold">
                            {isInstructorOrAdmin ? (userStats.totalStudents || 0) : gradedAttempts.length}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {isInstructorOrAdmin ? "Who took your exams" : "Successfully finished"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isInstructorOrAdmin ? "Published Exams" : "Time Spent"}
                          </p>
                          <p className="text-2xl font-bold">
                            {isInstructorOrAdmin ? (userStats.publishedExams || 0) : formatDuration(userStats.timeSpent || 0)}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {isInstructorOrAdmin ? "Available to students" : "Total exam time"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Results
                  </CardTitle>
                  <CardDescription>
                    {isInstructorOrAdmin ? "Latest student exam attempts" : "Your latest exam attempts"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-48"></div>
                            <div className="h-3 bg-muted rounded w-32"></div>
                          </div>
                          <div className="h-6 bg-muted rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentAttempts.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {isInstructorOrAdmin ? "No student attempts yet" : "No exam attempts yet"}
                      </p>
                      {!isInstructorOrAdmin && (
                        <Link href="/exams">
                          <Button className="mt-4" data-testid="button-browse-exams">
                            Browse Exams
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentAttempts.map((attempt) => (
                        <div 
                          key={attempt.id} 
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{attempt.exam?.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(attempt.startedAt).toLocaleDateString()}
                              </span>
                              {attempt.submittedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.round(
                                    (new Date(attempt.submittedAt).getTime() - 
                                     new Date(attempt.startedAt).getTime()) / (1000 * 60)
                                  )} min
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {getStatusBadge(attempt)}
                            {attempt.score !== null && attempt.score !== undefined && (
                              <div className={`px-2 py-1 rounded-md text-sm font-medium ${getScoreColor(attempt.score)}`}>
                                {Math.round(attempt.score)}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              {/* Search and Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="history-search" className="sr-only">Search exam history</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          id="history-search"
                          placeholder="Search by exam title..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-history"
                        />
                      </div>
                    </div>
                    <div className="sm:w-40">
                      <Select value={filterPeriod} onValueChange={(value: any) => setFilterPeriod(value)}>
                        <SelectTrigger data-testid="select-period">
                          <SelectValue placeholder="Time period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:w-40">
                      <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                        <SelectTrigger data-testid="select-status-filter">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="graded">Completed</SelectItem>
                          <SelectItem value="submitted">Under Review</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="h-5 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-4 bg-muted rounded w-1/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredAttempts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground text-center">
                      {searchQuery || filterStatus !== 'all' || filterPeriod !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'You haven\'t taken any exams yet.'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredAttempts.map((attempt) => (
                    <Card key={attempt.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-2">{attempt.exam?.title}</h3>
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {attempt.exam?.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Started: {new Date(attempt.startedAt).toLocaleString()}
                              </span>
                              {attempt.submittedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Submitted: {new Date(attempt.submittedAt).toLocaleString()}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Time Limit: {attempt.timeLimit} min
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3 ml-6">
                            {getStatusBadge(attempt)}
                            {attempt.score !== null && attempt.score !== undefined && (
                              <div className={`px-3 py-1 rounded-md text-lg font-bold ${getScoreColor(attempt.score)}`}>
                                {Math.round(attempt.score)}%
                              </div>
                            )}
                            {attempt.status === 'in_progress' && (
                              <Link href={`/exam/${attempt.examId}/attempt/${attempt.id}`}>
                                <Button size="sm" data-testid={`button-resume-attempt-${attempt.id}`}>
                                  Resume
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Analytics
                  </CardTitle>
                  <CardDescription>
                    Detailed insights into your exam performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {gradedAttempts.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No analytics available</h3>
                      <p className="text-muted-foreground">
                        Complete some exams to see your performance analytics.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Score Distribution */}
                      <div>
                        <h4 className="font-semibold mb-3">Score Distribution</h4>
                        <div className="space-y-2">
                          {[
                            { range: '90-100%', count: gradedAttempts.filter(a => a.score! >= 90).length, color: 'bg-green-500' },
                            { range: '70-89%', count: gradedAttempts.filter(a => a.score! >= 70 && a.score! < 90).length, color: 'bg-blue-500' },
                            { range: '60-69%', count: gradedAttempts.filter(a => a.score! >= 60 && a.score! < 70).length, color: 'bg-yellow-500' },
                            { range: '0-59%', count: gradedAttempts.filter(a => a.score! < 60).length, color: 'bg-red-500' },
                          ].map((item) => (
                            <div key={item.range} className="flex items-center gap-3">
                              <div className="w-20 text-sm">{item.range}</div>
                              <div className="flex-1 bg-muted rounded-full h-4 relative">
                                <div 
                                  className={`${item.color} h-4 rounded-full transition-all duration-300`}
                                  style={{ 
                                    width: `${gradedAttempts.length > 0 ? (item.count / gradedAttempts.length) * 100 : 0}%` 
                                  }}
                                />
                              </div>
                              <div className="w-8 text-sm text-muted-foreground">{item.count}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Average Score Trend */}
                      {gradedAttempts.length >= 3 && (
                        <div>
                          <h4 className="font-semibold mb-3">Recent Performance Trend</h4>
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-muted-foreground">Last 5 attempts average:</span>
                              <span className="font-semibold">
                                {Math.round(
                                  gradedAttempts
                                    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                                    .slice(0, 5)
                                    .reduce((sum, attempt) => sum + (attempt.score || 0), 0) /
                                  Math.min(5, gradedAttempts.length)
                                )}%
                              </span>
                            </div>
                            <Progress 
                              value={Math.round(
                                gradedAttempts
                                  .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                                  .slice(0, 5)
                                  .reduce((sum, attempt) => sum + (attempt.score || 0), 0) /
                                Math.min(5, gradedAttempts.length)
                              )} 
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </AppLayout>
  );
}