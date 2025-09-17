import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppLayout } from '@/components/layout/app-layout';
import type { User } from '@shared/schema';
import { 
  HelpCircle, 
  BookOpen, 
  Keyboard, 
  Volume2, 
  Mic,
  Eye,
  Settings,
  Clock,
  Play,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Lightbulb,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Link } from 'wouter';

export default function Help() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = authUser as User;
  const { announceForScreenReader } = useAccessibility();

  useEffect(() => {
    announceForScreenReader('Help center loaded. Find answers to common questions and get support.');
  }, [announceForScreenReader]);

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

  return (
    <AppLayout 
      title="Help Center"
      description="Help center loaded. Find answers to common questions and get support."
    >

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-4">Help Center</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get support, find answers, and learn how to make the most of OPSIS's accessible exam platform.
            </p>
          </div>

          <Tabs defaultValue="getting-started" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="getting-started" data-testid="tab-getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="accessibility" data-testid="tab-accessibility">Accessibility</TabsTrigger>
              <TabsTrigger value="exams" data-testid="tab-exams">Taking Exams</TabsTrigger>
              <TabsTrigger value="support" data-testid="tab-support">Support</TabsTrigger>
            </TabsList>

            {/* Getting Started Tab */}
            <TabsContent value="getting-started" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Welcome to OPSIS
                  </CardTitle>
                  <CardDescription>
                    OPSIS is designed specifically for blind and low-vision users, providing a fully accessible exam experience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">For Students</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Browse available exams on the Exams page</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Take exams with full screen reader support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Use voice input for hands-free answers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Review your results and performance</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">For Instructors</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Create accessible exams with the exam authoring tool</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Support multiple question types</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Set time limits and exam preferences</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Monitor student progress and grade submissions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Link href="/exams">
                      <Button className="w-full h-auto py-4 px-6 flex flex-col items-center gap-2" variant="outline" data-testid="button-browse-exams">
                        <BookOpen className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-medium">Browse Exams</div>
                          <div className="text-xs text-muted-foreground">Find available exams</div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/accessibility-settings">
                      <Button className="w-full h-auto py-4 px-6 flex flex-col items-center gap-2" variant="outline" data-testid="button-accessibility-settings">
                        <Settings className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-medium">Accessibility Settings</div>
                          <div className="text-xs text-muted-foreground">Customize your experience</div>
                        </div>
                      </Button>
                    </Link>
                    {user.role === 'instructor' && (
                      <Link href="/exam-authoring">
                        <Button className="w-full h-auto py-4 px-6 flex flex-col items-center gap-2" variant="outline" data-testid="button-create-exam">
                          <FileText className="h-6 w-6" />
                          <div className="text-center">
                            <div className="font-medium">Create Exam</div>
                            <div className="text-xs text-muted-foreground">Author new exams</div>
                          </div>
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Accessibility Tab */}
            <TabsContent value="accessibility" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Accessibility Features
                  </CardTitle>
                  <CardDescription>
                    OPSIS is built with accessibility at its core, providing comprehensive support for users with visual impairments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="screen-reader">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        Screen Reader Support
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p>OPSIS is fully compatible with popular screen readers including:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>NVDA (Windows)</li>
                          <li>JAWS (Windows)</li>
                          <li>VoiceOver (macOS, iOS)</li>
                          <li>TalkBack (Android)</li>
                          <li>Orca (Linux)</li>
                        </ul>
                        <p>All interface elements have proper ARIA labels and semantic markup for optimal screen reader navigation.</p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="tts">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Text-to-Speech (TTS)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p>Built-in text-to-speech functionality allows you to:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Have exam questions and content read aloud</li>
                          <li>Adjust speech rate and volume</li>
                          <li>Choose from available system voices</li>
                          <li>Pause, resume, and stop speech at any time</li>
                        </ul>
                        <p>TTS controls are available throughout the exam-taking experience.</p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="voice-input">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Voice Input
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p>Voice input capabilities enable:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Hands-free answer input for essay and short answer questions</li>
                          <li>Voice commands for navigation</li>
                          <li>Speech-to-text conversion with high accuracy</li>
                          <li>Support for multiple languages</li>
                        </ul>
                        <Badge variant="secondary" className="mt-2">Requires browser microphone permission</Badge>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="keyboard">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Keyboard className="h-4 w-4" />
                        Keyboard Navigation
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Basic Navigation</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Tab</kbd> - Navigate forward through elements</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Shift+Tab</kbd> - Navigate backward through elements</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Enter/Space</kbd> - Activate buttons and controls</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Arrow keys</kbd> - Navigate within radio groups and menus</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Escape</kbd> - Close dialogs and menus</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Global Shortcuts</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+H</kbd> - Go to dashboard</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+E</kbd> - Go to exams page</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+R</kbd> - Go to results page</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+S</kbd> - Open accessibility settings</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+T</kbd> - Toggle theme</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">F1</kbd> - Open help page</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Skip Navigation</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+K</kbd> or <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Alt+M</kbd> - Jump to main content</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+L</kbd> or <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Alt+N</kbd> - Jump to navigation</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+1-6</kbd> - Jump to heading levels</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Text-to-Speech Controls</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+Space</kbd> - Toggle TTS (play/pause/resume)</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+Shift+Space</kbd> - Stop TTS completely</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Font Size Controls</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl++</kbd> - Increase font size</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+-</kbd> - Decrease font size</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+0</kbd> - Reset font size to default</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Exam Taking Shortcuts</h4>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+N</kbd> - Next question</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+P</kbd> - Previous question</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+F</kbd> - Flag question for review</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Alt+Shift+S</kbd> - Save answers</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl+Enter</kbd> - Submit exam (on last question)</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">1-9</kbd> - Select multiple choice options</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">1</kbd> - True (for true/false questions)</li>
                            <li><kbd className="px-2 py-1 bg-muted rounded">2</kbd> - False (for true/false questions)</li>
                          </ul>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Tip:</strong> All shortcuts are designed to work seamlessly with screen readers and other assistive technologies. Press Tab to discover interactive elements and use these shortcuts for faster navigation.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="visual">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Visual Customization
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <p>Customize the visual experience with:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>High contrast themes for better visibility</li>
                          <li>Adjustable font sizes (small, medium, large, extra large)</li>
                          <li>Dark and light theme options</li>
                          <li>Reduced motion settings for users sensitive to animations</li>
                        </ul>
                        <p>Access these settings from the Accessibility Toolbar or Settings page.</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Taking Exams Tab */}
            <TabsContent value="exams" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Taking Exams
                  </CardTitle>
                  <CardDescription>
                    Step-by-step guide to taking exams on OPSIS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Find and Start an Exam</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Navigate to the Exams page to browse available exams. Click "Start Exam" to begin.
                        </p>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Check time limits before starting
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Navigate Questions</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Use the Previous/Next buttons or keyboard navigation to move between questions. Your answers are automatically saved.
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">Auto-save enabled</Badge>
                          <Badge variant="outline" className="text-xs">Flag questions for review</Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Answer Questions</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Answer using keyboard input, voice input, or screen reader navigation:
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• <strong>Multiple Choice:</strong> Select options using radio buttons or arrow keys</li>
                          <li>• <strong>True/False:</strong> Choose True or False using radio buttons</li>
                          <li>• <strong>Short Answer:</strong> Type or use voice input in text fields</li>
                          <li>• <strong>Essay:</strong> Use the text area or voice input for longer responses</li>
                        </ul>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Submit Your Exam</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Review your answers and submit when ready. You'll receive confirmation of successful submission.
                        </p>
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Cannot edit after submission
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exam Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium">Before Starting</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Test your accessibility settings</li>
                        <li>• Ensure stable internet connection</li>
                        <li>• Check time limits and requirements</li>
                        <li>• Have assistive technology ready</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium">During the Exam</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Monitor the timer in the top-right corner</li>
                        <li>• Flag difficult questions for later review</li>
                        <li>• Use TTS to re-read questions if needed</li>
                        <li>• Save frequently (auto-save is enabled)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Get Support
                  </CardTitle>
                  <CardDescription>
                    Need help? We're here to assist you with any questions or issues.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <Card className="border-2 border-primary/20">
                      <CardContent className="p-6 text-center">
                        <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Email Support</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get help via email for non-urgent issues
                        </p>
                        <Button variant="outline" className="w-full" data-testid="button-email-support">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-200">
                      <CardContent className="p-6 text-center">
                        <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Live Chat</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Chat with our support team in real-time
                        </p>
                        <Button variant="outline" className="w-full" data-testid="button-live-chat">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Start Chat
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200">
                      <CardContent className="p-6 text-center">
                        <Phone className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Phone Support</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Call us for urgent technical issues
                        </p>
                        <Button variant="outline" className="w-full" data-testid="button-phone-support">
                          <Phone className="h-4 w-4 mr-2" />
                          Call Now
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="browser-support">
                      <AccordionTrigger>Which browsers are supported?</AccordionTrigger>
                      <AccordionContent>
                        OPSIS works best with modern browsers including Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. For optimal accessibility, we recommend using the latest version of your preferred browser with your screen reader.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="technical-issues">
                      <AccordionTrigger>What should I do if I encounter technical issues during an exam?</AccordionTrigger>
                      <AccordionContent>
                        If you experience technical difficulties during an exam, don't panic. Your progress is automatically saved. Try refreshing the page first. If issues persist, contact support immediately. We can help restore your session and extend time limits if needed.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="assistive-tech">
                      <AccordionTrigger>How do I optimize OPSIS for my screen reader?</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <p>For the best experience with your screen reader:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Use browse/focus mode as appropriate for your screen reader</li>
                            <li>Enable forms mode when filling out exam answers</li>
                            <li>Use landmark navigation (headings, lists, forms) for quick navigation</li>
                            <li>Adjust speech rate and verbosity settings in your screen reader preferences</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="privacy">
                      <AccordionTrigger>How is my data protected?</AccordionTrigger>
                      <AccordionContent>
                        OPSIS takes data privacy seriously. All exam data is encrypted in transit and at rest. We comply with educational privacy standards and only collect data necessary for the exam experience. Your personal information is never shared with third parties without your consent.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="mobile">
                      <AccordionTrigger>Can I use OPSIS on mobile devices?</AccordionTrigger>
                      <AccordionContent>
                        Yes! OPSIS is fully responsive and works on tablets and smartphones. Mobile screen readers like VoiceOver (iOS) and TalkBack (Android) are fully supported. However, we recommend using a desktop or laptop computer for the best exam-taking experience when possible.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Additional Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button variant="outline" className="h-auto p-4 justify-start" data-testid="button-user-guide">
                      <FileText className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">User Guide</div>
                        <div className="text-xs text-muted-foreground">Complete documentation</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start" data-testid="button-video-tutorials">
                      <Play className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Video Tutorials</div>
                        <div className="text-xs text-muted-foreground">Step-by-step guides</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start" data-testid="button-accessibility-guide">
                      <Eye className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Accessibility Guide</div>
                        <div className="text-xs text-muted-foreground">Detailed accessibility info</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start" data-testid="button-community-forum">
                      <MessageSquare className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Community Forum</div>
                        <div className="text-xs text-muted-foreground">Connect with other users</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </AppLayout>
  );
}