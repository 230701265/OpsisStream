import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/app-layout';
import type { User } from '@shared/schema';
import { 
  BookOpen, 
  Clock, 
  Play, 
  Edit, 
  Users, 
  Filter, 
  Search,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';

interface Exam {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  published: boolean;
  createdAt: string;
  questionCount?: number;
  authorId: string;
  authorName?: string;
}

interface Attempt {
  id: string;
  examId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
}

export default function Exams() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = authUser as User;
  const { announceForScreenReader } = useAccessibility();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'completed' | 'in_progress' | 'published' | 'draft'>('all');

  const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin';

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['/api/exams'],
    enabled: !!user,
  });

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['/api/user/attempts'],
    enabled: !!user && !isInstructorOrAdmin,
  });

  useEffect(() => {
    const message = isInstructorOrAdmin 
      ? 'Exams page loaded. Manage your created exams and view student activity.'
      : 'Exams page loaded. Browse available exams and view your progress.';
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

  const examsList = (exams as Exam[]) || [];
  const attemptsList = (attempts as Attempt[]) || [];
  const isLoading = examsLoading || (attemptsLoading && !isInstructorOrAdmin);

  // For instructors/admins: show only exams they created
  // For students: show published exams they can take
  const relevantExams = isInstructorOrAdmin 
    ? examsList.filter(exam => exam.authorId === user?.id)
    : examsList.filter(exam => exam.published);

  // Create a map of exam attempts for quick lookup (students only)
  const attemptsByExam = !isInstructorOrAdmin ? attemptsList.reduce((acc, attempt) => {
    if (!acc[attempt.examId]) {
      acc[attempt.examId] = [];
    }
    acc[attempt.examId].push(attempt);
    return acc;
  }, {} as Record<string, Attempt[]>) : {};

  // Filter exams based on search and status
  const filteredExams = relevantExams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (isInstructorOrAdmin) {
      // For instructors/admins: filter by published status
      switch (filterStatus) {
        case 'all':
          return true;
        case 'published':
          return exam.published;
        case 'draft':
          return !exam.published;
        default:
          return true;
      }
    } else {
      // Student filtering logic (original)
      if (filterStatus === 'all') return true;
      
      const examAttempts = attemptsByExam[exam.id] || [];
      const hasInProgress = examAttempts.some(a => a.status === 'in_progress');
      const hasCompleted = examAttempts.some(a => a.status === 'graded');
      
      switch (filterStatus) {
        case 'available':
          return !hasInProgress && !hasCompleted;
        case 'in_progress':
          return hasInProgress;
        case 'completed':
          return hasCompleted;
        default:
          return true;
      }
    }
  });

  const getExamStatus = (exam: Exam) => {
    const examAttempts = attemptsByExam[exam.id] || [];
    const inProgress = examAttempts.find(a => a.status === 'in_progress');
    const completed = examAttempts.find(a => a.status === 'graded');
    
    if (inProgress) {
      return { status: 'in_progress', attempt: inProgress };
    }
    if (completed) {
      return { status: 'completed', attempt: completed };
    }
    return { status: 'available', attempt: null };
  };

  return (
    <AppLayout 
      title={isInstructorOrAdmin ? "My Exams" : "Available Exams"}
      description={`Exams page loaded. You have ${filteredExams.length} exams${filteredExams.length > 0 ? ` displayed from ${relevantExams.length || 0} total` : ''}.`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {isInstructorOrAdmin ? "My Created Exams" : "Available Exams"}
                </h1>
                <p className="text-muted-foreground">
                  {isInstructorOrAdmin 
                    ? "Manage your exams, view student results, and track performance."
                    : "Browse and take exams. Your progress is automatically saved."
                  }
                </p>
              </div>
              {isInstructorOrAdmin && (
                <Link href="/exam-authoring">
                  <Button className="flex items-center gap-2" data-testid="button-create-exam">
                    <Plus className="h-4 w-4" />
                    Create New Exam
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search-input" className="sr-only">Search exams</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search-input"
                      placeholder="Search exams by title or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger data-testid="select-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exams</SelectItem>
                      {isInstructorOrAdmin ? (
                        <>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exams Grid */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                      <div className="h-8 bg-muted rounded mt-4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No exams found</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : isInstructorOrAdmin 
                      ? 'You haven\'t created any exams yet. Click "Create New Exam" to get started.'
                      : 'There are no published exams available at this time.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const examStatus = !isInstructorOrAdmin ? getExamStatus(exam) : null;
                
                return (
                  <Card key={exam.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold line-clamp-2">
                          {exam.title}
                        </CardTitle>
                        <div className="flex flex-col gap-1 ml-4">
                          {isInstructorOrAdmin ? (
                            <Badge variant={exam.published ? "default" : "secondary"} 
                                   className={exam.published ? "bg-green-100 text-green-800" : ""}>
                              {exam.published ? 'Published' : 'Draft'}
                            </Badge>
                          ) : (
                            <>
                              {examStatus?.status === 'completed' && (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {examStatus?.status === 'in_progress' && (
                                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                              {examStatus?.status === 'available' && (
                                <Badge variant="secondary">
                                  Available
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {exam.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {exam.timeLimit} minutes
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(exam.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {isInstructorOrAdmin ? (
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {exam.questionCount || 0} questions
                            </div>
                          </div>
                        ) : (
                          examStatus?.status === 'completed' && examStatus.attempt?.score !== undefined && (
                            <div className="text-sm">
                              <span className="font-medium">Your Score: </span>
                              <span className={examStatus.attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}>
                                {examStatus.attempt.score}%
                              </span>
                            </div>
                          )
                        )}

                        <div className="flex gap-2">
                          {isInstructorOrAdmin ? (
                            <>
                              <Link href={`/exam-authoring/${exam.id}`} className="flex-1">
                                <Button variant="outline" className="w-full" data-testid={`button-edit-${exam.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </Link>
                              <Link href={`/exams/${exam.id}/results`} className="flex-1">
                                <Button variant="outline" className="w-full" data-testid={`button-results-${exam.id}`}>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Results
                                </Button>
                              </Link>
                            </>
                          ) : (
                            examStatus?.status === 'in_progress' ? (
                              <Link 
                                href={`/exam/${exam.id}/attempt/${examStatus.attempt?.id}`}
                                className="flex-1"
                              >
                                <Button className="w-full" data-testid={`button-resume-${exam.id}`}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume Exam
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/exam/${exam.id}`} className="flex-1">
                                <Button 
                                  className="w-full" 
                                  variant={examStatus?.status === 'completed' ? 'outline' : 'default'}
                                  data-testid={`button-start-${exam.id}`}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {examStatus?.status === 'completed' ? 'Retake Exam' : 'Start Exam'}
                                </Button>
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
      </div>
    </AppLayout>
  );
}