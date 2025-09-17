import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePythonVoiceInput } from "@/hooks/usePythonVoiceInput";
import { usePythonTTS } from "@/hooks/usePythonTTS";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface PythonVoiceInputProps {
  className?: string;
  onCommand?: (command: any) => void;
  onTranscript?: (transcript: string) => void;
}

export function PythonVoiceInput({ 
  className, 
  onCommand, 
  onTranscript 
}: PythonVoiceInputProps) {
  const { handleGlobalVoiceCommand, announceForScreenReader } = useAccessibility();
  const { speak: speakWithTTS } = usePythonTTS();
  
  const { 
    isSupported, 
    isListening, 
    transcript, 
    error, 
    lastCommand,
    startListening, 
    stopListening, 
    resetTranscript,
    speakText
  } = usePythonVoiceInput({
    onVoiceCommand: onCommand || handleGlobalVoiceCommand
  });

  const [showTranscript, setShowTranscript] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  // Handle command execution
  useEffect(() => {
    if (lastCommand && lastCommand.type !== 'unknown') {
      console.log('Python voice command executed:', lastCommand);
      announceForScreenReader(`Command executed: ${lastCommand.action}`);
      
      // Provide audio feedback
      speakText(`Command ${lastCommand.action} executed`);
    }
  }, [lastCommand, announceForScreenReader, speakText]);

  // Handle errors
  useEffect(() => {
    if (error) {
      announceForScreenReader(`Voice input error: ${error}`, 'assertive');
    }
  }, [error, announceForScreenReader]);

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening();
      announceForScreenReader('Voice input stopped');
    } else {
      setIsProcessing(true);
      
      try {
        await startListening({
          continuous: false,
          interimResults: true,
        });
        
        announceForScreenReader('Python voice recognition started. Speak clearly for up to 5 seconds.');
        await speakText('Voice recognition ready. Please speak your command.');
        
      } catch (err) {
        console.error('Failed to start Python voice input:', err);
        announceForScreenReader('Failed to start voice input');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClear = () => {
    resetTranscript();
    announceForScreenReader('Voice input cleared');
  };

  const handleReadInstructions = async () => {
    const instructions = onCommand ? `
      Python-powered voice input is active for exam taking. You can use the following commands:
      Navigation: "next question", "previous question", "go to question 5", "first question", "last question".
      Answers: "option A", "option B", "option C", "option D", "answer true", "answer false".
      You can also use phonetic alphabet: "alpha", "bravo", "charlie", "delta".
      Actions: "save answer", "submit exam", "flag question", "clear answer".
      Reading: "read question", "read options", "stop reading", "repeat".
      Status: "time", "progress", "current question", "answered questions".
      Say "help" for more information.
    ` : `
      Python-powered global voice navigation is active. You can use these commands:
      Navigation: "go home", "go to exams", "go to results", "settings", "admin".
      Reading: "read page", "stop reading".
      Accessibility: "increase font", "decrease font", "reset font", "change theme".
      Say "help" for complete voice command list.
      The Python backend provides higher accuracy than browser-based recognition.
    `;
    
    await speakText(instructions);
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Python voice input requires a modern browser with microphone support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            🐍 Python Voice Input
            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReadInstructions}
              aria-label="Read voice command instructions"
              data-testid="button-python-voice-instructions"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
              data-testid="button-toggle-python-transcript"
            >
              {showTranscript ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={handleToggleListening}
              aria-label={isListening ? "Stop listening" : "Start Python voice input"}
              className="flex-1"
              data-testid="button-python-voice-toggle"
              disabled={isProcessing}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Starting...' : 'Start Voice Input'}
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              aria-label="Clear transcript"
              data-testid="button-clear-python-transcript"
            >
              Clear
            </Button>
          </div>

          {/* Status indicators */}
          <div className="flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-red-500 animate-pulse' : 
              isProcessing ? 'bg-yellow-500 animate-pulse' :
              'bg-gray-400'
            }`} />
            <span className="text-muted-foreground">
              {isListening ? 'Listening...' : 
               isProcessing ? 'Processing...' :
               'Ready'}
            </span>
            <span className="text-xs text-green-600 font-medium">
              🚀 High Accuracy
            </span>
          </div>

          {/* Transcript display */}
          {showTranscript && (
            <div className="border rounded-md p-3 min-h-[60px] bg-background">
              <p className="text-xs text-muted-foreground mb-1">Transcript:</p>
              {transcript ? (
                <p className="text-sm" data-testid="python-voice-transcript">
                  {transcript}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isListening ? 'Listening for speech...' : 'No speech detected yet'}
                </p>
              )}
            </div>
          )}

          {/* Command result display */}
          {lastCommand && lastCommand.type !== 'unknown' && (
            <div className="border rounded-md p-2 bg-green-50 dark:bg-green-900/20">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                ✅ Command Recognized:
              </p>
              <p className="text-sm font-medium" data-testid="python-voice-command">
                {lastCommand.action} ({lastCommand.confidence}% confidence)
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="border rounded-md p-2 bg-red-50 dark:bg-red-900/20">
              <p className="text-xs text-red-600 dark:text-red-400 mb-1">Error:</p>
              <p className="text-sm" data-testid="python-voice-error">
                {error}
              </p>
            </div>
          )}

          {/* Features highlight */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>🎯 <strong>Features:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Multiple recognition engines (Google, Sphinx)</li>
              <li>• Enhanced command processing</li>
              <li>• Natural language understanding</li>
              <li>• Phonetic alphabet support (Alpha, Bravo, etc.)</li>
              <li>• High-quality TTS feedback</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}