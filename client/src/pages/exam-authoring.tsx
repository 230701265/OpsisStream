import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AccessibilityToolbar } from '@/components/ui/accessibility-toolbar';
import { TTSControls } from '@/components/ui/tts-controls';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  ChevronUp, 
  ChevronDown, 
  Copy,
  BookOpen,
  Clock,
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ExamData {
  title: string;
  description: string;
  timeLimit: number;
  published: boolean;
  settings: {
    allowTTS: boolean;
    allowVoiceInput: boolean;
    showResults: boolean;
    randomizeQuestions: boolean;
  };
}

interface QuestionData {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  content: {
    text: string;
    options?: string[];
  };
  correctAnswer?: any;
  points: number;
  order: number;
}

const defaultExam: ExamData = {
  title: '',
  description: '',
  timeLimit: 60,
  published: false,
  settings: {
    allowTTS: true,
    allowVoiceInput: true,
    showResults: true,
    randomizeQuestions: false,
  },
};

const defaultQuestion: QuestionData = {
  type: 'multiple_choice',
  content: {
    text: '',
    options: ['', '', '', ''],
  },
  correctAnswer: '',
  points: 1,
  order: 1,
};

export default function ExamAuthoring() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { announceForScreenReader } = useAccessibility();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const examId = params.examId;
  const isEditing = !!examId;

  const [examData, setExamData] = useState<ExamData>(defaultExam);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeStep, setActiveStep] = useState<'details' | 'questions' | 'settings' | 'preview'>('details');
  const [previewText, setPreviewText] = useState('');

  // Check if user is instructor or admin
  useEffect(() => {
    if (!authLoading && !['instructor', 'admin'].includes((user as any)?.role)) {
      toast({
        title: "Access Denied",
        description: "Only instructors and admins can create and edit exams.",
        variant: "destructive",
      });
      setLocation('/');
    }
  }, [user, authLoading, setLocation, toast]);

  // Fetch existing exam data if editing
  const { data: existingExam, isLoading: examLoading } = useQuery({
    queryKey: ['/api/exams', examId],
    enabled: isEditing && !!examId,
  });

  const { data: existingQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['/api/exams', examId, 'questions'],
    enabled: isEditing && !!examId,
  });

  // Initialize form data when editing
  useEffect(() => {
    if (existingExam) {
      setExamData({
        title: (existingExam as any)?.title || '',
        description: (existingExam as any)?.description || '',
        timeLimit: (existingExam as any)?.timeLimit || 60,
        published: (existingExam as any)?.published || false,
        settings: (existingExam as any)?.settings || defaultExam.settings,
      });
    }
  }, [existingExam]);

  useEffect(() => {
    if (existingQuestions) {
      setQuestions((existingQuestions as any[]).map((q: any) => ({
        type: q.type,
        content: q.content,
        correctAnswer: q.correctAnswer,
        points: q.points,
        order: q.order,
      })));
    }
  }, [existingQuestions]);

  // Save exam mutation
  const saveExamMutation = useMutation({
    mutationFn: async (data: ExamData) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/exams/${examId}`, data);
      } else {
        return await apiRequest('POST', '/api/exams', data);
      }
    },
    onSuccess: (response) => {
      announceForScreenReader('Exam saved successfully');
      toast({
        title: "Success",
        description: "Exam saved successfully",
      });
      if (!isEditing && response) {
        const newExamId = (response as any).id;
        setLocation(`/exam-authoring/${newExamId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
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
        title: "Error",
        description: "Failed to save exam. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save questions mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async (question: QuestionData) => {
      return await apiRequest('POST', `/api/exams/${examId}/questions`, question);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams', examId, 'questions'] });
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
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExamDataChange = (field: keyof ExamData, value: any) => {
    setExamData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setExamData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const addQuestion = () => {
    const newQuestion = {
      ...defaultQuestion,
      order: questions.length + 1,
    };
    setQuestions(prev => [...prev, newQuestion]);
    announceForScreenReader(`New question added. Total questions: ${questions.length + 1}`);
  };

  const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateQuestionContent = (index: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { 
        ...q, 
        content: { ...q.content, [field]: value } 
      } : q
    ));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    // Update order numbers
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });

    setQuestions(newQuestions);
    announceForScreenReader(`Question moved ${direction}. New position: ${newIndex + 1}`);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, order: i + 1 })));
    announceForScreenReader(`Question removed. Total questions: ${questions.length - 1}`);
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...questions[index] };
    questionToDuplicate.order = questions.length + 1;
    setQuestions(prev => [...prev, questionToDuplicate]);
    announceForScreenReader(`Question duplicated. Total questions: ${questions.length + 1}`);
  };

  const generatePreview = () => {
    let preview = `${examData.title}\n\n${examData.description}\n\n`;
    preview += `Time Limit: ${examData.timeLimit} minutes\n`;
    preview += `Total Questions: ${questions.length}\n\n`;
    
    questions.forEach((q, index) => {
      preview += `Question ${index + 1}: ${q.content.text}\n`;
      if (q.type === 'multiple_choice' && q.content.options) {
        q.content.options.forEach((option, optIndex) => {
          if (option.trim()) {
            preview += `${String.fromCharCode(65 + optIndex)}. ${option}\n`;
          }
        });
      } else if (q.type === 'true_false') {
        preview += 'A. True\nB. False\n';
      }
      preview += `Points: ${q.points}\n\n`;
    });
    
    setPreviewText(preview);
    setActiveStep('preview');
  };

  const saveExam = () => {
    if (!examData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an exam title.",
        variant: "destructive",
      });
      return;
    }

    saveExamMutation.mutate(examData);
  };

  const publishExam = () => {
    if (questions.length === 0) {
      toast({
        title: "Cannot Publish",
        description: "Please add at least one question before publishing.",
        variant: "destructive",
      });
      return;
    }

    const updatedData = { ...examData, published: true };
    setExamData(updatedData);
    saveExamMutation.mutate(updatedData);
  };

  if (authLoading || (isEditing && (examLoading || questionsLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exam editor...</p>
        </div>
      </div>
    );
  }

  if (!user || (user as any)?.role !== 'instructor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary">OPSIS</h1>
              <div className="sr-only" aria-live="polite">
                Exam Authoring - {isEditing ? 'Editing' : 'Creating'} Exam
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <AccessibilityToolbar />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
                data-testid="button-back-home"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-border bg-card p-4">
          <nav className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground mb-4">Exam Builder</h2>
            
            <Button
              variant={activeStep === 'details' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveStep('details')}
              data-testid="button-step-details"
            >
              <BookOpen className="h-4 w-4 mr-2" aria-hidden="true" />
              Exam Details
            </Button>

            <Button
              variant={activeStep === 'questions' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveStep('questions')}
              data-testid="button-step-questions"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Questions ({questions.length})
            </Button>

            <Button
              variant={activeStep === 'settings' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveStep('settings')}
              data-testid="button-step-settings"
            >
              <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
              Settings
            </Button>

            <Button
              variant={activeStep === 'preview' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={generatePreview}
              data-testid="button-step-preview"
            >
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              Preview
            </Button>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Button
                onClick={saveExam}
                disabled={saveExamMutation.isPending}
                className="w-full"
                data-testid="button-save-exam"
              >
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                {saveExamMutation.isPending ? 'Saving...' : 'Save Exam'}
              </Button>

              {examData.published ? (
                <Button variant="outline" className="w-full" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Published
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={publishExam}
                  disabled={saveExamMutation.isPending || questions.length === 0}
                  className="w-full"
                  data-testid="button-publish-exam"
                >
                  Publish Exam
                </Button>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6" id="main-content">
          <div className="max-w-4xl mx-auto">
            
            {/* Exam Details Step */}
            {activeStep === 'details' && (
              <Card>
                <CardHeader>
                  <CardTitle>Exam Details</CardTitle>
                  <CardDescription>
                    Basic information about your exam
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="exam-title">Exam Title *</Label>
                    <Input
                      id="exam-title"
                      value={examData.title}
                      onChange={(e) => handleExamDataChange('title', e.target.value)}
                      placeholder="Enter exam title"
                      data-testid="input-exam-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exam-description">Description</Label>
                    <Textarea
                      id="exam-description"
                      value={examData.description}
                      onChange={(e) => handleExamDataChange('description', e.target.value)}
                      placeholder="Describe what this exam covers"
                      className="min-h-[100px]"
                      data-testid="textarea-exam-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                    <Input
                      id="time-limit"
                      type="number"
                      min="1"
                      max="300"
                      value={examData.timeLimit}
                      onChange={(e) => handleExamDataChange('timeLimit', parseInt(e.target.value) || 60)}
                      data-testid="input-time-limit"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={examData.published}
                      onCheckedChange={(checked) => handleExamDataChange('published', checked)}
                      disabled={questions.length === 0}
                      data-testid="switch-published"
                    />
                    <Label htmlFor="published">
                      Publish exam (make available to students)
                    </Label>
                  </div>
                  
                  {questions.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add questions before publishing the exam.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions Step */}
            {activeStep === 'questions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Questions</h2>
                    <p className="text-muted-foreground">
                      Create and manage exam questions
                    </p>
                  </div>
                  <Button onClick={addQuestion} data-testid="button-add-question">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Question
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start building your exam by adding your first question.
                      </p>
                      <Button onClick={addQuestion} data-testid="button-add-first-question">
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                        Add First Question
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Question {index + 1}
                            </CardTitle>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveQuestion(index, 'up')}
                                disabled={index === 0}
                                aria-label="Move question up"
                                data-testid={`button-move-up-${index}`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveQuestion(index, 'down')}
                                disabled={index === questions.length - 1}
                                aria-label="Move question down"
                                data-testid={`button-move-down-${index}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateQuestion(index)}
                                aria-label="Duplicate question"
                                data-testid={`button-duplicate-${index}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(index)}
                                aria-label="Delete question"
                                data-testid={`button-delete-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`question-type-${index}`}>Question Type</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => updateQuestion(index, 'type', value)}
                              >
                                <SelectTrigger data-testid={`select-question-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                  <SelectItem value="true_false">True/False</SelectItem>
                                  <SelectItem value="short_answer">Short Answer</SelectItem>
                                  <SelectItem value="essay">Essay</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`question-points-${index}`}>Points</Label>
                              <Input
                                id={`question-points-${index}`}
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={question.points}
                                onChange={(e) => updateQuestion(index, 'points', parseFloat(e.target.value) || 1)}
                                data-testid={`input-points-${index}`}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`question-text-${index}`}>Question Text</Label>
                            <Textarea
                              id={`question-text-${index}`}
                              value={question.content.text}
                              onChange={(e) => updateQuestionContent(index, 'text', e.target.value)}
                              placeholder="Enter your question"
                              className="min-h-[80px]"
                              data-testid={`textarea-question-text-${index}`}
                            />
                          </div>

                          {question.type === 'multiple_choice' && (
                            <div className="space-y-2">
                              <Label>Answer Options</Label>
                              {question.content.options?.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <span className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.content.options || [])];
                                      newOptions[optionIndex] = e.target.value;
                                      updateQuestionContent(index, 'options', newOptions);
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                    data-testid={`input-option-${index}-${optionIndex}`}
                                  />
                                </div>
                              ))}
                              
                              <div className="space-y-2">
                                <Label htmlFor={`correct-answer-${index}`}>Correct Answer</Label>
                                <Select
                                  value={question.correctAnswer || ''}
                                  onValueChange={(value) => updateQuestion(index, 'correctAnswer', value)}
                                >
                                  <SelectTrigger data-testid={`select-correct-answer-${index}`}>
                                    <SelectValue placeholder="Select correct answer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {question.content.options?.map((option, optionIndex) => (
                                      <SelectItem key={optionIndex} value={String.fromCharCode(97 + optionIndex)}>
                                        {String.fromCharCode(65 + optionIndex)}. {option || `Option ${String.fromCharCode(65 + optionIndex)}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {question.type === 'true_false' && (
                            <div className="space-y-2">
                              <Label htmlFor={`correct-answer-tf-${index}`}>Correct Answer</Label>
                              <Select
                                value={question.correctAnswer || ''}
                                onValueChange={(value) => updateQuestion(index, 'correctAnswer', value)}
                              >
                                <SelectTrigger data-testid={`select-correct-answer-tf-${index}`}>
                                  <SelectValue placeholder="Select correct answer" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Step */}
            {activeStep === 'settings' && (
              <Card>
                <CardHeader>
                  <CardTitle>Exam Settings</CardTitle>
                  <CardDescription>
                    Configure accessibility and exam behavior options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Accessibility Features</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="allow-tts">Allow Text-to-Speech</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable TTS for students with visual impairments
                        </p>
                      </div>
                      <Switch
                        id="allow-tts"
                        checked={examData.settings.allowTTS}
                        onCheckedChange={(checked) => handleSettingsChange('allowTTS', checked)}
                        data-testid="switch-allow-tts"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="allow-voice">Allow Voice Input</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable voice commands and speech-to-text
                        </p>
                      </div>
                      <Switch
                        id="allow-voice"
                        checked={examData.settings.allowVoiceInput}
                        onCheckedChange={(checked) => handleSettingsChange('allowVoiceInput', checked)}
                        data-testid="switch-allow-voice"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Exam Behavior</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="show-results">Show Results to Students</Label>
                        <p className="text-sm text-muted-foreground">
                          Display scores and correct answers after submission
                        </p>
                      </div>
                      <Switch
                        id="show-results"
                        checked={examData.settings.showResults}
                        onCheckedChange={(checked) => handleSettingsChange('showResults', checked)}
                        data-testid="switch-show-results"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="randomize">Randomize Question Order</Label>
                        <p className="text-sm text-muted-foreground">
                          Present questions in random order for each student
                        </p>
                      </div>
                      <Switch
                        id="randomize"
                        checked={examData.settings.randomizeQuestions}
                        onCheckedChange={(checked) => handleSettingsChange('randomizeQuestions', checked)}
                        data-testid="switch-randomize"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview Step */}
            {activeStep === 'preview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Exam Preview</h2>
                    <p className="text-muted-foreground">
                      Review how your exam will appear to students
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {examData.published ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {examData.timeLimit} min
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Exam Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{examData.title}</h3>
                          <p className="text-muted-foreground">{examData.description}</p>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Questions:</span>
                            <span className="ml-2 font-medium">{questions.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time Limit:</span>
                            <span className="ml-2 font-medium">{examData.timeLimit} min</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Points:</span>
                            <span className="ml-2 font-medium">
                              {questions.reduce((sum, q) => sum + q.points, 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span className="ml-2 font-medium">
                              {examData.published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-medium text-foreground mb-2">Accessibility Features</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center">
                              {examData.settings.allowTTS ? (
                                <CheckCircle className="h-4 w-4 text-success mr-2" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                              )}
                              Text-to-Speech
                            </div>
                            <div className="flex items-center">
                              {examData.settings.allowVoiceInput ? (
                                <CheckCircle className="h-4 w-4 text-success mr-2" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-muted-foreground mr-2" />
                              )}
                              Voice Input
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>TTS Preview</CardTitle>
                      <CardDescription>
                        Test how the exam will sound with text-to-speech
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TTSControls text={previewText} />
                    </CardContent>
                  </Card>
                </div>

                {questions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Question Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {questions.slice(0, 3).map((question, index) => (
                          <div key={index} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-foreground">
                                Question {index + 1}
                              </h4>
                              <Badge variant="outline">
                                {question.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-foreground mb-3">{question.content.text}</p>
                            
                            {question.type === 'multiple_choice' && question.content.options && (
                              <div className="space-y-2">
                                {question.content.options.map((option, optIndex) => (
                                  option.trim() && (
                                    <div key={optIndex} className="flex items-center space-x-2">
                                      <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">
                                        {String.fromCharCode(65 + optIndex)}
                                      </span>
                                      <span className="text-muted-foreground">{option}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'true_false' && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">A</span>
                                  <span className="text-muted-foreground">True</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">B</span>
                                  <span className="text-muted-foreground">False</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-3 text-sm text-muted-foreground">
                              Points: {question.points}
                            </div>
                          </div>
                        ))}
                        
                        {questions.length > 3 && (
                          <div className="text-center text-muted-foreground">
                            ... and {questions.length - 3} more questions
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
