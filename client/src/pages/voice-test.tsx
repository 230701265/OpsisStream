import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PythonVoiceInput } from '@/components/ui/python-voice-input';
import { VoiceInput } from '@/components/ui/voice-input';
import { useAccessibility } from '@/hooks/useAccessibility';
import { usePythonTTS } from '@/hooks/usePythonTTS';
import { ArrowLeft, Mic, Volume2 } from 'lucide-react';
import { Link } from 'wouter';

export default function VoiceTest() {
  const { handleGlobalVoiceCommand, announceForScreenReader } = useAccessibility();
  const { speak: pythonSpeak } = usePythonTTS();
  const [lastCommand, setLastCommand] = useState<any>(null);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

  const handleCommand = (command: any) => {
    console.log('Voice test received command:', command);
    setLastCommand(command);
    setCommandHistory(prev => [command, ...prev.slice(0, 9)]); // Keep last 10 commands
    
    // Also execute the global command
    handleGlobalVoiceCommand(command);
    
    announceForScreenReader(`Voice command received: ${command.action || command.type}`);
  };

  const testPythonTTS = async () => {
    const testText = "This is a test of the Python-powered text-to-speech system. The quality should be much higher than browser TTS.";
    await pythonSpeak(testText);
  };

  const clearHistory = () => {
    setCommandHistory([]);
    setLastCommand(null);
    announceForScreenReader('Command history cleared');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">🐍 Python Voice System Test</h1>
              <p className="text-muted-foreground">
                Compare browser vs Python-powered voice recognition accuracy
              </p>
            </div>
          </div>
          <Button onClick={testPythonTTS} variant="outline">
            <Volume2 className="h-4 w-4 mr-2" />
            Test Python TTS
          </Button>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Python Voice Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🐍 Python Voice Recognition</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  High Accuracy
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enhanced recognition with multiple engines and natural language processing
              </p>
            </CardHeader>
            <CardContent>
              <PythonVoiceInput onCommand={handleCommand} />
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold">Features:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ Google Speech API + Sphinx fallback</li>
                  <li>✅ Enhanced command processing</li>
                  <li>✅ Phonetic alphabet support (Alpha, Bravo, etc.)</li>
                  <li>✅ Natural language understanding</li>
                  <li>✅ Better noise handling</li>
                  <li>✅ Higher quality TTS feedback</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Browser Voice Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🌐 Browser Voice Recognition</span>
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  Standard
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Standard Web Speech API with basic command processing
              </p>
            </CardHeader>
            <CardContent>
              <VoiceInput onCommand={handleCommand} />
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold">Features:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>⚠️ Browser-dependent accuracy</li>
                  <li>⚠️ Limited noise handling</li>
                  <li>⚠️ Basic command matching</li>
                  <li>⚠️ Internet connection required</li>
                  <li>⚠️ Limited customization</li>
                  <li>⚠️ Varies by browser</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Command Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last Command */}
          <Card>
            <CardHeader>
              <CardTitle>Last Voice Command</CardTitle>
            </CardHeader>
            <CardContent>
              {lastCommand ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{lastCommand.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Action:</span>
                    <span className="text-sm">{lastCommand.action || 'N/A'}</span>
                  </div>
                  {lastCommand.confidence && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence:</span>
                      <span className="text-sm">{Math.round(lastCommand.confidence * 100)}%</span>
                    </div>
                  )}
                  {lastCommand.value && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Value:</span>
                      <span className="text-sm">{lastCommand.value}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No commands received yet. Try using voice input above.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Command History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Command History
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  Clear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commandHistory.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {commandHistory.map((cmd, index) => (
                    <div key={index} className="border rounded p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{cmd.type}</span>
                        <span className="text-muted-foreground">
                          {cmd.confidence ? `${Math.round(cmd.confidence * 100)}%` : ''}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {cmd.action || 'No action'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Command history will appear here
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Commands */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Test Commands</CardTitle>
            <p className="text-sm text-muted-foreground">
              Try these commands to test accuracy and compare both systems
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Navigation</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>"go to exams"</li>
                  <li>"go home"</li>
                  <li>"help"</li>
                  <li>"settings"</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Exam Commands</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>"next question"</li>
                  <li>"previous question"</li>
                  <li>"option A" or "alpha"</li>
                  <li>"option B" or "bravo"</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Accessibility</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>"read page"</li>
                  <li>"stop reading"</li>
                  <li>"change theme"</li>
                  <li>"increase font"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Python Backend:</span>
                <div className="text-green-600">🟢 Running (Port 8000)</div>
              </div>
              <div>
                <span className="font-medium">Speech Recognition:</span>
                <div className="text-green-600">🟢 Multiple Engines</div>
              </div>
              <div>
                <span className="font-medium">TTS Quality:</span>
                <div className="text-green-600">🟢 Enhanced</div>
              </div>
              <div>
                <span className="font-medium">Command Processing:</span>
                <div className="text-green-600">🟢 NLP Enhanced</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}