import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessibilityToolbar } from "@/components/ui/accessibility-toolbar";
import { Volume2, Keyboard, Eye, Users, Shield, Clock } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

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
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">
                <span aria-label="OPSIS - Accessible Exam Platform">OPSIS</span>
              </h1>
            </div>
            <AccessibilityToolbar />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-background to-muted/50 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Accessible Online Exams for Everyone
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              OPSIS is an accessibility-first exam platform designed specifically for blind and low-vision users. 
              Experience seamless exam taking with comprehensive screen reader support, text-to-speech, and voice input.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="text-lg px-8 py-3"
                data-testid="button-login"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-3"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Built for Accessibility
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Every feature is designed with blind and low-vision users in mind, 
                ensuring an inclusive and empowering exam experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Screen Reader Support */}
              <Card className="h-full" data-testid="card-screen-reader">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Volume2 className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <CardTitle>Screen Reader Optimized</CardTitle>
                  <CardDescription>
                    Full compatibility with NVDA, JAWS, and VoiceOver with proper ARIA semantics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Semantic HTML structure</li>
                    <li>• Live regions for dynamic updates</li>
                    <li>• Comprehensive ARIA labels</li>
                    <li>• Logical reading order</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Text-to-Speech */}
              <Card className="h-full" data-testid="card-tts">
                <CardHeader>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                    <Keyboard className="h-6 w-6 text-secondary" aria-hidden="true" />
                  </div>
                  <CardTitle>Advanced Text-to-Speech</CardTitle>
                  <CardDescription>
                    Customizable TTS for all exam content with speed and voice control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Adjustable speech rate</li>
                    <li>• Multiple voice options</li>
                    <li>• Question-by-question reading</li>
                    <li>• Audio progress indicators</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Voice Input */}
              <Card className="h-full" data-testid="card-voice-input">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-4">
                    <Eye className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
                  </div>
                  <CardTitle>Voice Input & Commands</CardTitle>
                  <CardDescription>
                    Navigate and answer questions using voice commands and speech recognition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Voice navigation commands</li>
                    <li>• Speech-to-text answers</li>
                    <li>• Audio feedback</li>
                    <li>• Hands-free operation</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Keyboard Navigation */}
              <Card className="h-full" data-testid="card-keyboard">
                <CardHeader>
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <CardTitle>Keyboard-Only Navigation</CardTitle>
                  <CardDescription>
                    Complete exam functionality accessible through keyboard shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Logical tab order</li>
                    <li>• Skip links</li>
                    <li>• Keyboard shortcuts</li>
                    <li>• Focus management</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Security */}
              <Card className="h-full" data-testid="card-security">
                <CardHeader>
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-success" aria-hidden="true" />
                  </div>
                  <CardTitle>Secure & Reliable</CardTitle>
                  <CardDescription>
                    Server-side timer validation and comprehensive audit logging
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Encrypted data transmission</li>
                    <li>• Auto-save functionality</li>
                    <li>• Audit trail</li>
                    <li>• Offline support</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Time Management */}
              <Card className="h-full" data-testid="card-timer">
                <CardHeader>
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-warning" aria-hidden="true" />
                  </div>
                  <CardTitle>Smart Time Management</CardTitle>
                  <CardDescription>
                    Audio time announcements and warnings with server synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Audio time warnings</li>
                    <li>• Server-side validation</li>
                    <li>• Progress announcements</li>
                    <li>• Time remaining alerts</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Ready to Experience Accessible Exams?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join educators and students who are already using OPSIS for inclusive online assessments.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="text-lg px-8 py-3"
              data-testid="button-cta-login"
            >
              Get Started Today
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 OPSIS. Built with accessibility at its core.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
