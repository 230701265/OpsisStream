import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAccessibility } from '@/hooks/useAccessibility';
import { AccessibilityToolbar } from '@/components/ui/accessibility-toolbar';
import { Badge } from '@/components/ui/badge';
import { Volume2, ArrowLeft, Mic, Navigation, Activity, Settings, Keyboard } from 'lucide-react';

export default function VoiceCommandsHelp() {
  const [, setLocation] = useLocation();
  const { announceForScreenReader, speakWithPreferences } = useAccessibility();

  const readFullGuide = () => {
    const fullText = `
      Voice Commands Help Guide for OPSIS.
      
      OPSIS provides comprehensive voice control features designed specifically for blind and low-vision users. You can navigate the entire platform, take exams, and manage settings using voice commands.
      
      Global Navigation Commands:
      Say "go home" or "dashboard" to return to the main dashboard.
      Say "go to exams" to view available exams.
      Say "go to results" to see your exam results.
      Say "settings" or "accessibility" to open accessibility settings.
      Say "admin" to access the admin panel if you have permissions.
      Say "help" to get voice command assistance.
      
      Exam Taking Commands:
      Navigation: "next question", "previous question", "go to question" followed by a number, "first question", "last question".
      Answer Selection: "option A", "option B", "option C", "option D", "option E" for multiple choice. "answer true" or "answer false" for true/false questions.
      Actions: "save answer", "submit exam", "flag question", "unflag question", "clear answer".
      Reading: "read question", "read options", "stop reading", "repeat".
      Status: "time" for remaining time, "progress" for completion status, "current question", "total questions", "answered questions", "flagged questions".
      
      Accessibility Commands:
      Reading: "read page" to hear page content, "stop reading" to stop speech.
      Font Size: "increase font", "decrease font", "reset font".
      Theme: "change theme" to cycle through available themes.
      
      Tips for Best Results:
      Speak clearly and at a normal pace.
      Use natural language - the system understands variations of commands.
      Wait for the system to confirm your command before speaking again.
      If a command isn't recognized, try rephrasing it or say "help" for assistance.
    `;
    speakWithPreferences(fullText);
  };

  const readSection = (sectionTitle: string, content: string) => {
    speakWithPreferences(`${sectionTitle}. ${content}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Links */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/')}
                aria-label="Return to dashboard"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-primary">Voice Commands Help</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <AccessibilityToolbar />
              <Button
                onClick={readFullGuide}
                variant="outline"
                size="sm"
                aria-label="Read entire voice commands guide"
                data-testid="button-read-full-guide"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Read Full Guide
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <div className="text-center mb-8">
              <Mic className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-4">Voice Commands Guide</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                OPSIS provides comprehensive voice control features designed specifically for blind and low-vision users. 
                You can navigate the entire platform, take exams, and manage settings using voice commands.
              </p>
            </div>
          </section>

          {/* Keyboard Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                Keyboard Navigation (NVDA/JAWS Style)
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => readSection("Keyboard Navigation", "OPSIS provides NVDA and JAWS style keyboard navigation. Use single letter keys for quick navigation: Press H to navigate between headings, B for buttons, K for links, F for form fields, R for landmarks, L for lists, T for tables, and C for cards. Add Shift to go backwards. For TTS control, press P to pause or resume text-to-speech. Global shortcuts include Ctrl+Alt+H for dashboard, Ctrl+Alt+E for exams, Ctrl+Alt+R for results, Ctrl+Alt+S for settings, Ctrl+Alt+K for main content, and Ctrl+Alt+L for navigation.")}
                  aria-label="Read keyboard navigation section"
                  data-testid="button-read-keyboard"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>Navigate component-by-component using single-letter keys, just like NVDA and JAWS:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">Quick Navigation</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">H</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+H</kbd> - Headings</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">B</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+B</kbd> - Buttons</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">K</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+K</kbd> - Links</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">F</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+F</kbd> - Form fields</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">R</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+R</kbd> - Landmarks</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">L</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+L</kbd> - Lists</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">T</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+T</kbd> - Tables</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">C</kbd> / <kbd className="bg-muted px-2 py-1 rounded text-xs">Shift+C</kbd> - Cards</li>
                    </ul>
                  </div>
                  
                  <div>
                    <Badge variant="secondary" className="mb-2">TTS Control</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">P</kbd> - Pause/Resume TTS</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+Space</kbd> - Toggle TTS</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Alt+Shift+Space</kbd> - Stop TTS</li>
                    </ul>
                    
                    <Badge variant="secondary" className="mb-2 mt-3">Global Shortcuts</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+H</kbd> - Dashboard</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+E</kbd> - Exams</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+R</kbd> - Results</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+S</kbd> - Settings</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+K</kbd> - Main content</li>
                      <li><kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Alt+L</kbd> - Navigation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Quick Start
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => readSection("Quick Start", "To get started with voice commands, click the microphone button in the accessibility toolbar at the top of any page. When the microphone is active, you'll see a listening indicator. Speak clearly and use natural language. The system understands variations of commands, so you can say 'go home' or 'dashboard' to return to the main page.")}
                  aria-label="Read quick start section"
                  data-testid="button-read-quickstart"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>To get started with voice commands:</p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Click the microphone button in the accessibility toolbar at the top of any page</li>
                  <li>When the microphone is active, you'll see a "Listening..." indicator</li>
                  <li>Speak clearly and use natural language</li>
                  <li>The system understands variations of commands</li>
                  <li>Wait for confirmation before speaking the next command</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Global Navigation Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Navigation className="h-5 w-5 mr-2" />
                Global Navigation Commands
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => readSection("Global Navigation Commands", "These commands work from any page. Say 'go home' or 'dashboard' to return to the main dashboard. Say 'go to exams' to view available exams. Say 'go to results' to see your exam results. Say 'settings' or 'accessibility' to open accessibility settings. Say 'admin' to access the admin panel if you have permissions. Say 'help' to get voice command assistance.")}
                  aria-label="Read global navigation section"
                  data-testid="button-read-navigation"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">These commands work from any page:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Badge variant="secondary" className="mb-2">Navigation</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>"go home" or "dashboard"</li>
                      <li>"go to exams"</li>
                      <li>"go to results"</li>
                      <li>"settings" or "accessibility"</li>
                      <li>"admin" (if authorized)</li>
                      <li>"help"</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Badge variant="secondary" className="mb-2">Reading</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>"read page"</li>
                      <li>"stop reading"</li>
                    </ul>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">Accessibility</Badge>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>"increase font" or "bigger font"</li>
                      <li>"decrease font" or "smaller font"</li>
                      <li>"reset font"</li>
                      <li>"change theme" or "switch theme"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Taking Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Exam Taking Commands
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => readSection("Exam Taking Commands", "When taking an exam, you have access to specialized voice commands. For navigation, say 'next question', 'previous question', 'go to question' followed by a number, 'first question', or 'last question'. For answers, say 'option A', 'option B', 'option C', 'option D', 'option E' for multiple choice, or 'answer true' and 'answer false' for true/false questions. For actions, say 'save answer', 'submit exam', 'flag question', 'unflag question', or 'clear answer'. For reading, say 'read question', 'read options', 'stop reading', or 'repeat'. For status, say 'time', 'progress', 'current question', 'total questions', 'answered questions', or 'flagged questions'.")}
                  aria-label="Read exam commands section"
                  data-testid="button-read-exam-commands"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">When taking an exam, you have access to these specialized commands:</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">Navigation</Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>"next question"</li>
                    <li>"previous question"</li>
                    <li>"go to question [number]"</li>
                    <li>"first question"</li>
                    <li>"last question"</li>
                  </ul>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Answer Selection</Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>"option A/B/C/D/E"</li>
                    <li>"answer true/false"</li>
                    <li>"select A/B/C/D/E"</li>
                    <li>"choose true/false"</li>
                  </ul>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Actions</Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>"save answer"</li>
                    <li>"submit exam"</li>
                    <li>"flag question"</li>
                    <li>"unflag question"</li>
                    <li>"clear answer"</li>
                  </ul>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Reading</Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>"read question"</li>
                    <li>"read options"</li>
                    <li>"stop reading"</li>
                    <li>"repeat"</li>
                  </ul>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">Status</Badge>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>"time" (remaining)</li>
                    <li>"progress"</li>
                    <li>"current question"</li>
                    <li>"total questions"</li>
                    <li>"answered questions"</li>
                    <li>"flagged questions"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips for Best Results */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Speaking Guidelines</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Speak clearly and at a normal pace</li>
                    <li>• Use natural language - the system understands variations</li>
                    <li>• Wait for the system to confirm your command</li>
                    <li>• Ensure you're in a quiet environment when possible</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Troubleshooting</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• If a command isn't recognized, try rephrasing it</li>
                    <li>• Say "help" at any time for assistance</li>
                    <li>• Check that your microphone permissions are enabled</li>
                    <li>• Use the accessibility toolbar to toggle voice input on/off</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you need additional assistance with voice commands or accessibility features, you can:
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/accessibility-settings')}
                  className="w-full sm:w-auto"
                  data-testid="button-accessibility-settings"
                >
                  Open Accessibility Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => announceForScreenReader('For additional support, please contact your system administrator or refer to the main help documentation.')}
                  className="w-full sm:w-auto ml-0 sm:ml-2"
                  data-testid="button-contact-support"
                >
                  Contact Support Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}