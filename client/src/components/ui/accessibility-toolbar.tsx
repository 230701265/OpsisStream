import { Button } from "@/components/ui/button";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { usePythonTTS } from "@/hooks/usePythonTTS";
import { usePythonVoiceInput } from "@/hooks/usePythonVoiceInput";
import { useAccessibility } from "@/hooks/useAccessibility";
import { PythonVoiceInput } from "@/components/ui/python-voice-input";
import { Play, Pause, Mic, MicOff, Palette, Settings } from "lucide-react";
import { useState, useRef } from "react";

interface AccessibilityToolbarProps {
  className?: string;
}

export function AccessibilityToolbar({ className }: AccessibilityToolbarProps) {
  const { isPlaying, isPaused, pause, resume, stop, voices, speak } = useTTS();
  const { preferences, updatePreference, cycleTheme, handleGlobalVoiceCommand, announceForScreenReader } = useAccessibility();
  const { isListening, startListening, stopListening, isSupported: voiceSupported, processVoiceCommand, error: voiceError } = useVoiceInput({
    onVoiceCommand: handleGlobalVoiceCommand
  });
  
  // Python-powered alternatives
  const pythonTTS = usePythonTTS();
  const pythonVoice = usePythonVoiceInput({
    onVoiceCommand: handleGlobalVoiceCommand
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [usePythonBackend, setUsePythonBackend] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Force component refresh to sync with browser TTS state
  const refreshState = () => setRefreshTrigger(prev => prev + 1);

  const handleTTSToggle = () => {
    // Prevent rapid clicking
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset processing flag after a short delay
    timeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      refreshState(); // Refresh state after action completes
    }, 300);

    // Check current speech synthesis state directly from browser API
    const isSpeaking = speechSynthesis.speaking;
    const isPausedApi = speechSynthesis.paused;

    if (isSpeaking && !isPausedApi) {
      // Currently speaking - pause it
      pause();
    } else if (isSpeaking && isPausedApi) {
      // Currently paused - resume it
      resume();
    } else {
      // Not speaking - start new speech
      const mainContent = document.querySelector('main');
      if (mainContent) {
        const text = mainContent.textContent || '';
        if (text.trim()) {
          const selectedVoice = preferences.ttsVoice 
            ? voices.find(voice => voice.name === preferences.ttsVoice)
            : undefined;
          
          speak(text, {
            rate: preferences.ttsRate,
            voice: selectedVoice,
          });
        }
      }
    }
    
    // Immediate refresh to update button state
    setTimeout(refreshState, 100);
  };

  // Determine current TTS state for consistent icon display
  const getCurrentTTSState = () => {
    const isSpeaking = speechSynthesis.speaking;
    const isPausedApi = speechSynthesis.paused;
    
    return {
      isActivelySpeaking: isSpeaking && !isPausedApi,
      isPaused: isSpeaking && isPausedApi,
      isStopped: !isSpeaking
    };
  };

  const ttsState = getCurrentTTSState();

  const handleVoiceToggle = () => {
    console.log('Voice toggle clicked:', { isListening, voiceSupported });
    
    if (!voiceSupported) {
      announceForScreenReader('Voice input not supported in this browser');
      return;
    }
    
    if (isListening) {
      console.log('Stopping voice listening');
      stopListening();
      announceForScreenReader('Voice input stopped');
    } else {
      console.log('Starting voice listening');
      startListening({
        continuous: true,
        interimResults: true,
      });
      announceForScreenReader('Voice input started - please speak your command');
    }
  };

  // Voice command processing for global commands
  const handleVoiceCommand = (command: any) => {
    // Process the command with global voice handler
    handleGlobalVoiceCommand(command);
  };

  const handleRateChange = (value: number[]) => {
    updatePreference('ttsRate', value[0]);
  };

  const handleVoiceChange = (voiceName: string) => {
    updatePreference('ttsVoice', voiceName === 'default' ? null : voiceName);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Quick TTS Control */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTTSToggle}
        aria-label={
          ttsState.isActivelySpeaking
            ? "Pause text-to-speech"
            : ttsState.isPaused
            ? "Resume text-to-speech"
            : "Start text-to-speech"
        }
        className={`h-8 w-8 p-0 ${ttsState.isActivelySpeaking ? "bg-primary/10 text-primary" : ""}`}
        data-testid="button-tts-toggle"
      >
        {ttsState.isActivelySpeaking ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Voice Input */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleVoiceToggle}
        aria-label={
          !voiceSupported 
            ? "Voice input not supported in this browser"
            : isListening 
            ? "Stop voice input" 
            : "Start voice input"
        }
        className={`h-8 w-8 p-0 ${isListening ? "bg-primary/10 text-primary" : ""} ${!voiceSupported ? "opacity-50 cursor-not-allowed" : ""}`}
        data-testid="button-voice-toggle"
        disabled={!voiceSupported}
      >
        {!voiceSupported ? (
          <MicOff className="h-4 w-4 text-muted-foreground" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {/* Show voice input status/error */}
      {voiceError && (
        <div className="text-xs text-destructive max-w-xs truncate" title={voiceError}>
          Error: {voiceError.split('.')[0]}
        </div>
      )}

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleTheme}
        aria-label={`Current theme: ${preferences.theme}. Click to change theme.`}
        className="h-8 w-8 p-0"
        data-testid="button-theme-toggle"
      >
        <Palette className="h-4 w-4" />
      </Button>
    </div>
  );
}
