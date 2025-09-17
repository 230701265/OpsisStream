import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useTTS } from '@/hooks/useTTS';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { TTSControls } from '@/components/ui/tts-controls';
import { VoiceInput } from '@/components/ui/voice-input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Eye, 
  Volume2, 
  Mic, 
  Keyboard, 
  Monitor, 
  Palette,
  TestTube,
  Save,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { Link } from 'wouter';

export default function AccessibilitySettings() {
  const { user, isAuthenticated } = useAuth();
  const { 
    preferences, 
    updatePreference, 
    cycleTheme, 
    announceForScreenReader,
    speakWithPreferences 
  } = useAccessibility();
  const { voices, isSupported: ttsSupported } = useTTS();

  const testText = "This is a test of the text-to-speech system. OPSIS is designed to be fully accessible with comprehensive screen reader support, voice input, and customizable visual themes.";

  useEffect(() => {
    announceForScreenReader('Accessibility settings page loaded. You can customize your experience here.');
  }, [announceForScreenReader]);

  const handleTestTTS = () => {
    console.log('Testing TTS from accessibility settings');
    speakWithPreferences(testText);
  };

  const handleResetSettings = () => {
    updatePreference('theme', 'default');
    updatePreference('fontSize', 'medium');
    updatePreference('ttsRate', 1.2);
    updatePreference('ttsVoice', null);
    updatePreference('reducedMotion', false);
    updatePreference('highContrast', false);
    updatePreference('screenReaderAnnouncements', true);
    announceForScreenReader('Settings reset to defaults');
  };

  const handleSaveSettings = () => {
    // Settings are automatically saved via useAccessibility hook
    announceForScreenReader('Settings saved successfully');
  };

  return (
    <AppLayout 
      title="Accessibility Settings"
      description="Accessibility settings page loaded. You can customize your experience here."
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Accessibility Settings</h1>
          <p className="text-muted-foreground">
            Customize your OPSIS experience for optimal accessibility and usability.
          </p>
        </div>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
                <span>Current Configuration</span>
              </CardTitle>
              <CardDescription>
                Your current accessibility settings at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">Theme:</span>
                  <Badge variant="outline" data-testid="badge-current-theme">
                    {preferences.theme}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">Font Size:</span>
                  <Badge variant="outline" data-testid="badge-current-font-size">
                    {preferences.fontSize}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">TTS Speed:</span>
                  <Badge variant="outline" data-testid="badge-current-tts-speed">
                    {preferences.ttsRate}x
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" aria-hidden="true" />
                <span>Visual Settings</span>
              </CardTitle>
              <CardDescription>
                Customize the visual appearance for better readability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Color Theme</Label>
                <Select 
                  value={preferences.theme} 
                  onValueChange={(value) => updatePreference('theme', value as any)}
                >
                  <SelectTrigger id="theme-select" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Light)</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="high-contrast">High Contrast</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose a theme that provides the best contrast for your vision needs.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size-select">Font Size</Label>
                <Select 
                  value={preferences.fontSize} 
                  onValueChange={(value) => updatePreference('fontSize', value as any)}
                >
                  <SelectTrigger id="font-size-select" data-testid="select-font-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (14px)</SelectItem>
                    <SelectItem value="medium">Medium (16px)</SelectItem>
                    <SelectItem value="large">Large (18px)</SelectItem>
                    <SelectItem value="extra-large">Extra Large (22px)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Adjust text size for comfortable reading.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reduced-motion">Reduced Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations and transitions
                  </p>
                </div>
                <Switch
                  id="reduced-motion"
                  checked={preferences.reducedMotion}
                  onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
                  data-testid="switch-reduced-motion"
                />
              </div>

              <div className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={cycleTheme}
                  className="w-full"
                  data-testid="button-cycle-theme"
                >
                  <Palette className="h-4 w-4 mr-2" aria-hidden="true" />
                  Cycle Theme (Alt+T)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span>Audio & Text-to-Speech</span>
              </CardTitle>
              <CardDescription>
                Configure speech settings and audio preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ttsSupported ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tts-speed">Speech Speed: {preferences.ttsRate.toFixed(1)}x</Label>
                    <Slider
                      id="tts-speed"
                      min={0.5}
                      max={2.5}
                      step={0.1}
                      value={[preferences.ttsRate]}
                      onValueChange={(value) => updatePreference('ttsRate', value[0])}
                      className="w-full"
                      aria-label="Text-to-speech speed"
                      data-testid="slider-tts-speed"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Slow (0.5x)</span>
                      <span>Normal (1.0x)</span>
                      <span>Fast (2.5x)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-voice-select">Voice</Label>
                    <Select 
                      value={preferences.ttsVoice || "default"} 
                      onValueChange={(value) => updatePreference('ttsVoice', value === 'default' ? null : value)}
                    >
                      <SelectTrigger id="tts-voice-select" data-testid="select-tts-voice">
                        <SelectValue placeholder="System Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default</SelectItem>
                        {voices.filter(voice => voice.name && voice.name.trim() !== '').map((voice) => (
                          <SelectItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Select a voice that's comfortable for you to listen to.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="screen-reader-announcements">Screen Reader Announcements</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable live announcements for screen readers
                      </p>
                    </div>
                    <Switch
                      id="screen-reader-announcements"
                      checked={preferences.screenReaderAnnouncements}
                      onCheckedChange={(checked) => updatePreference('screenReaderAnnouncements', checked)}
                      data-testid="switch-announcements"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Test Text-to-Speech</Label>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={handleTestTTS}
                        className="flex-1"
                        data-testid="button-test-tts"
                      >
                        <TestTube className="h-4 w-4 mr-2" aria-hidden="true" />
                        Test Speech
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Click to hear how the current settings sound.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Text-to-Speech Not Supported
                  </h3>
                  <p className="text-muted-foreground">
                    Your browser doesn't support text-to-speech. Please use a modern browser 
                    or enable speech synthesis in your browser settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Input Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" aria-hidden="true" />
                <span>Voice Input</span>
              </CardTitle>
              <CardDescription>
                Test and configure voice commands and speech recognition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VoiceInput 
                placeholder="Test voice input here..."
                onCommand={(command) => {
                  announceForScreenReader(`Voice command detected: ${JSON.stringify(command)}`);
                }}
                onTranscript={(transcript) => {
                  console.log('Voice transcript:', transcript);
                }}
              />
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Keyboard className="h-5 w-5" aria-hidden="true" />
                <span>Keyboard Shortcuts</span>
              </CardTitle>
              <CardDescription>
                Global keyboard shortcuts available throughout OPSIS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Navigation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Home</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt+H</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Settings</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt+S</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Help</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">F1</kbd>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Accessibility</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cycle Theme</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt+T</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skip to Content</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Focus Ring</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab/Shift+Tab</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-foreground mb-2">Exam-Specific Shortcuts</h4>
                  <p className="text-sm text-muted-foreground">
                    Additional shortcuts are available during exams for navigation, 
                    saving answers, and accessing help.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TTS Testing Area */}
          <Card>
            <CardHeader>
              <CardTitle>TTS Testing Area</CardTitle>
              <CardDescription>
                Full text-to-speech controls for testing your configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TTSControls text={testText} />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleSaveSettings}
              className="flex-1"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              Save Settings
            </Button>
            <Button 
              variant="outline"
              onClick={handleResetSettings}
              className="flex-1"
              data-testid="button-reset-settings"
            >
              <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
              Reset to Defaults
            </Button>
          </div>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Resources for getting the most out of OPSIS accessibility features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Screen Reader Support</h4>
                  <p className="text-sm text-muted-foreground">
                    OPSIS works with NVDA, JAWS, and VoiceOver. Make sure your screen reader 
                    is configured to announce live regions and form changes.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Voice Commands</h4>
                  <p className="text-sm text-muted-foreground">
                    Use commands like "next question", "previous question", "option A", 
                    "save answer", and "submit exam" during exams.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  If you experience any accessibility issues, please contact your instructor 
                  or system administrator for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
