import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useTTS } from '@/hooks/useTTS';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ExamTimer } from '@/components/ui/exam-timer';
import { VoiceInput } from '@/components/ui/voice-input';
import { TTSControls } from '@/components/ui/tts-controls';
import { AccessibilityToolbar } from '@/components/ui/accessibility-toolbar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { isNavigationModifierPressed, isActionModifierPressed, isMac } from '@/lib/platform';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Save, 
  Send, 
  Clock, 
  AlertTriangle,
  Volume2
} from 'lucide-react';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  content: {
    text: string;
    options?: string[];
  };
  order: number;
}

interface Attempt {
  id: string;
  examId: string;
  startedAt: string;
  timeLimit: number;
  answers: Record<string, any>;
  status: string;
}

export default function ExamTaking() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { announceForScreenReader, speakWithPreferences } = useAccessibility();
  const { speak } = useTTS();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const examId = params.examId;
  const attemptId = params.attemptId;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Fetch exam attempt
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['/api/attempts', attemptId],
    enabled: !!attemptId,
    refetchInterval: 30000, // Refetch every 30 seconds for server sync
  });

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['/api/exams', examId, 'questions'],
    enabled: !!examId,
  });

  // Exam-specific keyboard shortcuts
  useEffect(() => {
    const handleExamKeyboardShortcuts = (event: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in input fields
      const isInInput = event.target instanceof HTMLInputElement || 
                       event.target instanceof HTMLTextAreaElement ||
                       (event.target instanceof HTMLElement && event.target.contentEditable === 'true');
      
      if (isInInput && !isNavigationModifierPressed(event) && !isActionModifierPressed(event)) {
        return;
      }

      // Navigation shortcuts with platform-appropriate modifier
      if (isNavigationModifierPressed(event) && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            if (currentQuestionIndex < ((questions as Question[]) || []).length - 1) {
              navigateToQuestion(currentQuestionIndex + 1);
            } else {
              announceForScreenReader('You are already on the last question');
            }
            break;
          case 'p':
            event.preventDefault();
            if (currentQuestionIndex > 0) {
              navigateToQuestion(currentQuestionIndex - 1);
            } else {
              announceForScreenReader('You are already on the first question');
            }
            break;
          case 'f':
            event.preventDefault();
            handleFlagQuestion();
            break;
        }
      }

      // Save with platform modifier + Shift + S
      if (isNavigationModifierPressed(event) && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSaveAnswers();
      }

      // Submit with platform action modifier + Enter
      if (isActionModifierPressed(event) && event.key === 'Enter') {
        event.preventDefault();
        const isLastQuestion = currentQuestionIndex === ((questions as Question[]) || []).length - 1;
        if (isLastQuestion) {
          handleSubmitExam();
        }
      }

      // Number keys for multiple choice (1-9)
      if (!isInInput && !isActionModifierPressed(event) && !isNavigationModifierPressed(event) && /^[1-9]$/.test(event.key)) {
        const optionIndex = parseInt(event.key) - 1;
        const currentQuestion = (questions as Question[])?.[currentQuestionIndex];
        if (currentQuestion?.type === 'multiple_choice') {
          const options = currentQuestion.content.options || [];
          if (optionIndex < options.length) {
            event.preventDefault();
            const selectedOption = options[optionIndex];
            handleAnswerChange(currentQuestion.id, selectedOption);
            announceForScreenReader(`Selected option ${optionIndex + 1}: ${selectedOption}`);
          }
        } else if (currentQuestion?.type === 'true_false') {
          if (event.key === '1') {
            event.preventDefault();
            handleAnswerChange(currentQuestion.id, true);
            announceForScreenReader('Selected: True');
          } else if (event.key === '2') {
            event.preventDefault();
            handleAnswerChange(currentQuestion.id, false);
            announceForScreenReader('Selected: False');
          }
        }
      }
    };

    // Only add event listener if we have questions loaded
    if (questions && (questions as Question[]).length > 0) {
      document.addEventListener('keydown', handleExamKeyboardShortcuts);
      return () => document.removeEventListener('keydown', handleExamKeyboardShortcuts);
    }
  }, [currentQuestionIndex, questions, announceForScreenReader]);

  // Create exam attempt if we only have examId (no attemptId)
  const createAttemptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/exams/${examId}/attempts`);
      return response.json();
    },
    onSuccess: (newAttempt) => {
      // Redirect to the exam with the new attempt ID
      setLocation(`/exam/${examId}/attempt/${newAttempt.id}`);
    },
    onError: (error) => {
      console.error('Error creating exam attempt:', error);
      if (isUnauthorizedError(error)) {
        setLocation('/');
        return;
      }
      toast({
        title: "Error Starting Exam",
        description: "Failed to start the exam. Please try again.",
        variant: "destructive",
      });
    },
  });

  // If we have examId but no attemptId, create an attempt
  useEffect(() => {
    if (examId && !attemptId && user) {
      createAttemptMutation.mutate();
    }
  }, [examId, attemptId, user]);

  // Auto-save mutation
  const saveAnswersMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      await apiRequest('PUT', `/api/attempts/${attemptId}/answers`, { answers });
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
      announceForScreenReader('Answers saved successfully');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Error",
        description: "Failed to save answers. Your work is saved locally.",
        variant: "destructive",
      });
    },
  });

  // Submit exam mutation
  const submitExamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/attempts/${attemptId}/submit`, { answers });
    },
    onSuccess: () => {
      announceForScreenReader('Exam submitted successfully! Redirecting to results.', 'assertive');
      setLocation('/results');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Submission Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize answers from attempt data
  useEffect(() => {
    if ((attempt as any)?.answers) {
      setAnswers((attempt as any).answers);
    }
  }, [attempt]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswersMutation.mutate(answers);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [answers, saveAnswersMutation]);

  // Voice command handler
  const handleVoiceCommand = (command: any) => {
    const currentQuestion = (questions as Question[])?.[currentQuestionIndex];
    
    switch (command.type) {
      case 'navigation':
        if (command.action === 'next') {
          if (currentQuestionIndex < (questions as Question[])?.length - 1) {
            navigateToQuestion(currentQuestionIndex + 1);
            announceForScreenReader(`Moved to question ${currentQuestionIndex + 2}`);
          } else {
            announceForScreenReader('Already on the last question');
          }
        } else if (command.action === 'previous') {
          if (currentQuestionIndex > 0) {
            navigateToQuestion(currentQuestionIndex - 1);
            announceForScreenReader(`Moved to question ${currentQuestionIndex}`);
          } else {
            announceForScreenReader('Already on the first question');
          }
        } else if (command.action === 'goto' && command.value) {
          const targetIndex = command.value - 1; // Convert to 0-based index
          if (targetIndex >= 0 && targetIndex < (questions as Question[])?.length) {
            navigateToQuestion(targetIndex);
            announceForScreenReader(`Jumped to question ${command.value}`);
          } else {
            announceForScreenReader(`Invalid question number. Please choose between 1 and ${(questions as Question[])?.length}`);
          }
        } else if (command.action === 'first') {
          navigateToQuestion(0);
          announceForScreenReader('Moved to first question');
        } else if (command.action === 'last') {
          navigateToQuestion((questions as Question[])?.length - 1);
          announceForScreenReader(`Moved to last question ${(questions as Question[])?.length}`);
        }
        break;
      
      case 'answer':
        if (!currentQuestion) {
          announceForScreenReader('No question available');
          break;
        }
        
        if (currentQuestion.type === 'multiple_choice') {
          const options = currentQuestion.content.options || [];
          const optionIndex = command.value.toLowerCase().charCodeAt(0) - 97; // Convert 'a' to 0, 'b' to 1, etc.
          
          if (optionIndex >= 0 && optionIndex < options.length) {
            const selectedOption = options[optionIndex];
            handleAnswerChange(currentQuestion.id, selectedOption);
            announceForScreenReader(`Selected option ${command.value.toUpperCase()}: ${selectedOption}`);
          } else {
            announceForScreenReader(`Invalid option. Available options are A through ${String.fromCharCode(96 + options.length).toUpperCase()}`);
          }
        } else if (currentQuestion.type === 'true_false') {
          const value = command.value === 'true' || command.value === true;
          handleAnswerChange(currentQuestion.id, value);
          announceForScreenReader(`Selected: ${value ? 'True' : 'False'}`);
        } else {
          announceForScreenReader('Voice answer selection not supported for this question type. Please type your answer.');
        }
        break;
      
      case 'action':
        if (command.action === 'save') {
          handleSaveAnswers();
          announceForScreenReader('Saving answers...');
        } else if (command.action === 'submit') {
          handleSubmitExam();
        } else if (command.action === 'flag') {
          handleFlagQuestion();
          announceForScreenReader(flaggedQuestions.has(currentQuestionIndex) ? 'Question flagged' : 'Question unflagged');
        } else if (command.action === 'unflag') {
          if (flaggedQuestions.has(currentQuestionIndex)) {
            handleFlagQuestion(); // This will unflag it
            announceForScreenReader('Question unflagged');
          } else {
            announceForScreenReader('Question is not flagged');
          }
        } else if (command.action === 'clear') {
          if (currentQuestion) {
            handleAnswerChange(currentQuestion.id, undefined);
            announceForScreenReader('Answer cleared');
          }
        }
        break;
      
      case 'accessibility':
        if (command.action === 'read_question') {
          readCurrentQuestion();
        } else if (command.action === 'read_options' && currentQuestion?.type === 'multiple_choice') {
          const options = currentQuestion.content.options || [];
          const optionsText = options.map((option, index) => 
            `Option ${String.fromCharCode(65 + index)}: ${option}`
          ).join('. ');
          speakWithPreferences(optionsText);
        } else if (command.action === 'read_instructions') {
          speakWithPreferences('Use voice commands to navigate and answer questions. Say \"next question\" or \"previous question\" to move around. Say \"option A\", \"option B\", etc. to select answers. Say \"save answer\" to save your progress.');
        } else if (command.action === 'stop_reading') {
          speechSynthesis.cancel();
          announceForScreenReader('Stopped reading');
        } else if (command.action === 'repeat') {
          readCurrentQuestion();
        }
        break;
      
      case 'status':
        if (command.action === 'time') {
          // Calculate remaining time
          const startTime = new Date((attempt as any)?.startedAt);
          const timeLimit = (attempt as any)?.timeLimit || 0;
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);
          const remaining = Math.max(0, timeLimit - elapsed);
          announceForScreenReader(`${remaining} minutes remaining`);
        } else if (command.action === 'progress') {
          const answered = Object.keys(answers).length;
          const total = (questions as Question[])?.length || 0;
          const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
          announceForScreenReader(`Progress: ${answered} of ${total} questions answered, ${percentage} percent complete`);
        } else if (command.action === 'current_question') {
          announceForScreenReader(`Currently on question ${currentQuestionIndex + 1}`);
        } else if (command.action === 'total_questions') {
          announceForScreenReader(`Total questions: ${(questions as Question[])?.length}`);
        } else if (command.action === 'answered_count') {
          const answered = Object.keys(answers).length;
          announceForScreenReader(`Answered questions: ${answered}`);
        } else if (command.action === 'flagged_count') {
          announceForScreenReader(`Flagged questions: ${flaggedQuestions.size}`);
        }
        break;
      
      case 'help':
        if (command.action === 'voice_commands') {
          const helpText = `Available voice commands: Say \"next question\" or \"previous question\" to navigate. Say \"go to question\" followed by a number to jump to a specific question. Say \"option A\", \"option B\", etc. to select answers. Say \"save answer\" to save your progress. Say \"flag question\" to mark for review. Say \"read question\" to hear the current question. Say \"time\" to hear remaining time. Say \"progress\" to hear your completion status.`;
          speakWithPreferences(helpText);
        }
        break;
      
      case 'text':
        // For essay and short answer questions, the voice input text could be used
        if (currentQuestion && (currentQuestion.type === 'short_answer' || currentQuestion.type === 'essay')) {
          handleAnswerChange(currentQuestion.id, command.value);
          announceForScreenReader('Text answer recorded');
        } else {
          announceForScreenReader('Voice text input not supported for this question type');
        }
        break;
        
      default:
        announceForScreenReader('Voice command not recognized. Say \"help\" for available commands.');
    }
  };

  const currentQuestion = (questions as Question[])?.[currentQuestionIndex];
  const progress = (questions as Question[]) ? ((currentQuestionIndex + 1) / (questions as Question[]).length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < ((questions as Question[])?.length || 0)) {
      setCurrentQuestionIndex(index);
      announceForScreenReader(`Navigated to question ${index + 1} of ${(questions as Question[])?.length}`);
      
      // Auto-read the new question
      setTimeout(() => {
        readCurrentQuestion();
      }, 500);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
    announceForScreenReader(`Answer updated for question ${currentQuestionIndex + 1}`);
  };

  const handleFlagQuestion = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
        announceForScreenReader('Question unflagged');
      } else {
        newSet.add(currentQuestionIndex);
        announceForScreenReader('Question flagged for review');
      }
      return newSet;
    });
  };

  const handleSaveAnswers = () => {
    saveAnswersMutation.mutate(answers);
  };

  const handleSubmitExam = () => {
    if (window.confirm('Are you sure you want to submit your exam? This cannot be undone.')) {
      submitExamMutation.mutate();
    }
  };

  const readCurrentQuestion = () => {
    const question = (questions as Question[])?.[currentQuestionIndex];
    if (!question) {
      announceForScreenReader('No question available');
      return;
    }

    let textToRead = `Question ${currentQuestionIndex + 1} of ${(questions as Question[])?.length}: ${question.content.text}`;
    
    // Add answer status
    const currentAnswer = answers[question.id];
    if (currentAnswer !== undefined) {
      textToRead += ' This question has been answered.';
    } else {
      textToRead += ' This question has not been answered yet.';
    }
    
    // Add flag status
    if (flaggedQuestions.has(currentQuestionIndex)) {
      textToRead += ' This question is flagged for review.';
    }
    
    if (question.type === 'multiple_choice' && question.content.options) {
      const optionsText = question.content.options
        .map((option, index) => `Option ${String.fromCharCode(65 + index)}: ${option}`)
        .join('. ');
      textToRead += `. The options are: ${optionsText}. Say \"option A\", \"option B\", and so on to select your answer.`;
    } else if (question.type === 'true_false') {
      textToRead += '. Answer True or False. Say \"answer true\" or \"answer false\" to respond.';
    } else if (question.type === 'short_answer' || question.type === 'essay') {
      textToRead += '. This is a text response question. You can dictate your answer or type it manually.';
    }
    
    speakWithPreferences(textToRead);
  };

  const handleTimeUp = () => {
    announceForScreenReader('Time is up! Submitting exam automatically.', 'assertive');
    submitExamMutation.mutate();
  };

  const handleTimeWarning = (minutesLeft: number) => {
    announceForScreenReader(`Warning: ${minutesLeft} minutes remaining`, 'assertive');
  };

  if (attemptLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">Exam Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The exam you're looking for could not be found or is no longer available.
              </p>
              <Button onClick={() => setLocation('/')} data-testid="button-return-home">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Links */}
      <a href="#question-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        Skip to question
      </a>
      <a href="#navigation-buttons" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-20 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        Skip to navigation
      </a>

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">OPSIS</h1>
              <div className="sr-only" aria-live="polite">
                Exam in progress - Question {currentQuestionIndex + 1} of {(questions as Question[])?.length}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <AccessibilityToolbar />
              <ExamTimer
                startTime={new Date((attempt as any)?.startedAt)}
                timeLimit={(attempt as any)?.timeLimit}
                onTimeUp={handleTimeUp}
                onWarning={handleTimeWarning}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Question Navigator */}
        <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-foreground mb-4">Question Navigator</h2>
          
          <div className="grid grid-cols-5 gap-2 mb-6" role="grid" aria-label="Question navigation">
            {(questions as Question[])?.map((_: any, index: number) => {
              const isAnswered = answers[(questions as Question[])[index].id] !== undefined;
              const isFlagged = flaggedQuestions.has(index);
              const isCurrent = index === currentQuestionIndex;
              
              return (
                <Button
                  key={index}
                  variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                  size="sm"
                  className={`h-8 w-8 text-xs ${isFlagged ? 'ring-2 ring-warning' : ''}`}
                  onClick={() => navigateToQuestion(index)}
                  aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', not answered'}${isFlagged ? ', flagged' : ''}${isCurrent ? ', current' : ''}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  data-testid={`button-question-${index + 1}`}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>

          {/* Progress Summary */}
          <Card>
            <CardContent className="p-3">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="font-medium" data-testid="text-answered-count">
                      {answeredCount}/{(questions as Question[])?.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flagged:</span>
                    <span className="font-medium" data-testid="text-flagged-count">
                      {flaggedQuestions.size}
                    </span>
                  </div>
                </div>

                {lastSavedAt && (
                  <div className="text-xs text-muted-foreground">
                    Last saved: {lastSavedAt.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voice Input */}
          <div className="mt-4">
            <VoiceInput
              onCommand={handleVoiceCommand}
              placeholder="Say your answer or command..."
            />
          </div>
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 p-6" role="main">
          <div className="max-w-4xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Question {currentQuestionIndex + 1} of {(questions as Question[])?.length}
                </h1>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {currentQuestion?.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {flaggedQuestions.has(currentQuestionIndex) && (
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      <Flag className="h-3 w-3 mr-1" aria-hidden="true" />
                      Flagged
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={readCurrentQuestion}
                  aria-label="Read current question aloud"
                  data-testid="button-read-question"
                >
                  <Volume2 className="h-4 w-4 mr-1" aria-hidden="true" />
                  Read Question
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlagQuestion}
                  aria-label={flaggedQuestions.has(currentQuestionIndex) ? "Remove flag" : "Flag for review"}
                  data-testid="button-flag-question"
                >
                  <Flag className="h-4 w-4 mr-1" aria-hidden="true" />
                  {flaggedQuestions.has(currentQuestionIndex) ? 'Unflag' : 'Flag'}
                </Button>
              </div>
            </div>

            {/* Question Content */}
            <Card className="mb-6">
              <CardContent className="p-6" id="question-content">
                <div className="prose max-w-none mb-6">
                  <p className="text-lg text-foreground" data-testid="text-question-content">
                    {currentQuestion?.content.text}
                  </p>
                </div>

                {/* Answer Input */}
                {currentQuestion?.type === 'multiple_choice' && (
                  <fieldset>
                    <legend className="sr-only">Answer options</legend>
                    <RadioGroup
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.content.options?.map((option, index) => {
                        const optionValue = String.fromCharCode(97 + index); // a, b, c, d
                        return (
                          <div key={optionValue} className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring">
                            <RadioGroupItem
                              value={optionValue}
                              id={`option-${optionValue}`}
                              className="mt-1"
                              data-testid={`radio-option-${optionValue}`}
                            />
                            <Label 
                              htmlFor={`option-${optionValue}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium text-foreground">
                                {optionValue.toUpperCase()}. {option}
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>
                )}

                {currentQuestion?.type === 'true_false' && (
                  <fieldset>
                    <legend className="sr-only">True or False</legend>
                    <RadioGroup
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring">
                        <RadioGroupItem value="true" id="option-true" className="mt-1" data-testid="radio-option-true" />
                        <Label htmlFor="option-true" className="flex-1 cursor-pointer">
                          <div className="font-medium text-foreground">True</div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring">
                        <RadioGroupItem value="false" id="option-false" className="mt-1" data-testid="radio-option-false" />
                        <Label htmlFor="option-false" className="flex-1 cursor-pointer">
                          <div className="font-medium text-foreground">False</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </fieldset>
                )}

                {(currentQuestion?.type === 'short_answer' || currentQuestion?.type === 'essay') && (
                  <div>
                    <Label htmlFor="answer-text" className="sr-only">
                      Your answer
                    </Label>
                    <Textarea
                      id="answer-text"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="min-h-[120px]"
                      data-testid="textarea-answer"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation and Actions */}
            <div className="flex justify-between items-center" id="navigation-buttons">
              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                data-testid="button-previous-question"
              >
                <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                Previous
              </Button>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleSaveAnswers}
                  disabled={saveAnswersMutation.isPending}
                  data-testid="button-save-answers"
                >
                  <Save className="h-4 w-4 mr-1" aria-hidden="true" />
                  {saveAnswersMutation.isPending ? 'Saving...' : 'Save Answers'}
                </Button>

                {currentQuestionIndex === ((questions as Question[])?.length || 0) - 1 ? (
                  <Button
                    onClick={handleSubmitExam}
                    disabled={submitExamMutation.isPending}
                    className="bg-success text-success-foreground hover:bg-success/90"
                    data-testid="button-submit-exam"
                  >
                    <Send className="h-4 w-4 mr-1" aria-hidden="true" />
                    {submitExamMutation.isPending ? 'Submitting...' : 'Submit Exam'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === ((questions as Question[])?.length || 0) - 1}
                    data-testid="button-next-question"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* TTS Controls Sidebar */}
          <div className="fixed bottom-4 right-4 w-80">
            <TTSControls text={currentQuestion?.content.text} />
          </div>
        </main>
      </div>
    </div>
  );
}
