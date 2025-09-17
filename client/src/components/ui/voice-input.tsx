import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useAccessibility } from '@/hooks/useAccessibility';

interface VoiceInputProps {
  onCommand?: (command: any) => void;
  onTranscript?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({ 
  onCommand, 
  onTranscript, 
  placeholder = "Press and hold to speak...",
  className 
}: VoiceInputProps) {
  const { 
    isSupported, 
    isListening, 
    transcript, 
    interimTranscript, 
    error,
    startListening,
    stopListening,
    resetTranscript,
    processVoiceCommand
  } = useVoiceInput();

  const { announceForScreenReader, speakWithPreferences, handleGlobalVoiceCommand } = useAccessibility();
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (transcript) {
      onTranscript?.(transcript);
      
      // Process voice commands
      const command = processVoiceCommand(transcript);
      if (command.type === 'suggestion') {
        // Handle command suggestions
        announceForScreenReader(`Command not recognized. ${command.suggestions?.join(' ') || 'Please try again.'}`);
        speakWithPreferences(`I didn't understand that command. ${command.suggestions?.[0] || 'Try saying "help" for available commands.'}`);
      } else if (command.type !== 'text') {
        // Try custom command handler first (for exam-specific commands)
        if (onCommand) {
          onCommand(command);
        } else {
          // Fall back to global voice command handler
          handleGlobalVoiceCommand(command);
        }
        announceForScreenReader(`Voice command recognized`);
        speakWithPreferences(`Command executed`);
      }
    }
  }, [transcript, onCommand, onTranscript, processVoiceCommand, handleGlobalVoiceCommand, announceForScreenReader]);

  useEffect(() => {
    if (error) {
      announceForScreenReader(`Voice input error: ${error}`, 'assertive');
    }
  }, [error, announceForScreenReader]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      announceForScreenReader('Voice input stopped');
    } else {
      startListening({
        continuous: true,  // Keep listening continuously
        interimResults: true,
      });
      announceForScreenReader('Voice input started. Speak clearly and wait a moment for the system to recognize your voice.');
      speakWithPreferences('Voice input ready. Please speak your command.');
    }
  };

  const handleClear = () => {
    resetTranscript();
    announceForScreenReader('Voice input cleared');
  };

  const handleReadInstructions = () => {
    const instructions = onCommand ? `
      Voice input is active for exam taking. You can use the following commands:
      Navigation: "next question", "previous question", "go to question 5", "first question", "last question".
      Answers: "option A", "option B", "option C", "option D", "answer true", "answer false".
      Actions: "save answer", "submit exam", "flag question", "clear answer".
      Reading: "read question", "read options", "stop reading", "repeat".
      Status: "time", "progress", "current question", "answered questions".
      Say "help" for more information.
    ` : `
      Global voice navigation is active. You can use these commands:
      Navigation: "go home", "go to exams", "go to results", "settings", "admin".
      Reading: "read page", "stop reading".
      Accessibility: "increase font", "decrease font", "reset font", "change theme".
      Say "help" for complete voice command list.
    `;
    speakWithPreferences(instructions);
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Voice input is not supported in your browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Voice Input</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReadInstructions}
              aria-label="Read voice command instructions"
              data-testid="button-voice-instructions"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
              data-testid="button-toggle-transcript"
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
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              className="flex-1"
              data-testid="button-voice-toggle"
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Listening
                </>
              )}
            </Button>

            {(transcript || interimTranscript) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                aria-label="Clear voice input"
                data-testid="button-voice-clear"
              >
                Clear
              </Button>
            )}
          </div>

          {isListening && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>Listening...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive" role="alert" data-testid="text-voice-error">
              Error: {error}
            </div>
          )}

          {showTranscript && (transcript || interimTranscript) && (
            <div className="bg-muted p-3 rounded-md">
              <div className="text-sm">
                <div className="font-medium text-foreground" data-testid="text-voice-transcript">
                  {transcript}
                </div>
                {interimTranscript && (
                  <div className="text-muted-foreground italic" data-testid="text-voice-interim">
                    {interimTranscript}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>{onCommand 
              ? 'Exam commands: "next/previous question", "option A/B/C/D", "save/submit", "read question"' 
              : 'Global commands: "go home/exams/results", "read page", "increase/decrease font", "change theme"'
            }</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
