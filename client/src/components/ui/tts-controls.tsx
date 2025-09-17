import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, SkipForward, SkipBack, Volume2 } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';
import { useAccessibility } from '@/hooks/useAccessibility';

interface TTSControlsProps {
  text?: string;
  autoRead?: boolean;
  className?: string;
}

export function TTSControls({ text, autoRead = false, className }: TTSControlsProps) {
  const { 
    isSupported, 
    isPlaying, 
    isPaused, 
    voices, 
    speak, 
    pause, 
    resume, 
    stop,
    initializeTTS,
    isInitialized 
  } = useTTS();

  const { preferences, updatePreference } = useAccessibility();

  const handlePlay = () => {
    console.log('TTS Controls: Play button clicked');
    
    // Initialize TTS on first use
    if (!isInitialized) {
      initializeTTS();
    }
    
    if (text) {
      const selectedVoice = preferences.ttsVoice 
        ? voices.find(voice => voice.name === preferences.ttsVoice)
        : undefined;
      
      console.log('TTS Controls: Speaking with voice:', selectedVoice?.name || 'default');
      
      speak(text, {
        rate: preferences.ttsRate,
        voice: selectedVoice,
      });
    } else {
      console.log('TTS Controls: No text provided to speak');
    }
  };

  const handleToggle = () => {
    console.log('TTS Controls: Toggle button clicked', { isPlaying, isPaused, isInitialized });
    
    // Initialize TTS on first use
    if (!isInitialized) {
      initializeTTS();
    }
    
    if (isPlaying && !isPaused) {
      // Currently playing - pause it
      console.log('TTS Controls: Pausing speech');
      pause();
    } else if (isPaused) {
      // Currently paused - resume it
      console.log('TTS Controls: Resuming speech');
      resume();
    } else {
      // Not playing - start new speech
      console.log('TTS Controls: Starting new speech');
      handlePlay();
    }
  };

  const handleRateChange = (value: number[]) => {
    updatePreference('ttsRate', value[0]);
  };

  const handleVoiceChange = (voiceName: string) => {
    updatePreference('ttsVoice', voiceName === 'default' ? null : voiceName);
  };

  const readCurrentPage = () => {
    console.log('TTS Controls: Read page button clicked');
    
    // Initialize TTS on first use
    if (!isInitialized) {
      initializeTTS();
    }
    
    const mainContent = document.querySelector('main');
    if (mainContent) {
      const pageText = mainContent.textContent || '';
      const cleanText = pageText.replace(/\s+/g, ' ').trim();
      
      if (cleanText.length > 0) {
        const selectedVoice = preferences.ttsVoice 
          ? voices.find(voice => voice.name === preferences.ttsVoice)
          : undefined;
        
        console.log('TTS Controls: Reading page content:', cleanText.substring(0, 100) + '...');
        
        speak(cleanText, {
          rate: preferences.ttsRate,
          voice: selectedVoice,
        });
      } else {
        console.log('TTS Controls: No page content found to read');
        speak('No readable content found on this page.', {
          rate: preferences.ttsRate,
        });
      }
    } else {
      console.log('TTS Controls: Main content element not found');
      speak('Unable to find main content on this page.', {
        rate: preferences.ttsRate,
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Text-to-speech is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Text-to-Speech Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            aria-label={
              isPlaying
                ? isPaused
                  ? "Resume text-to-speech"
                  : "Pause text-to-speech"
                : "Start text-to-speech"
            }
            data-testid="button-tts-play-pause"
          >
            {isPlaying && !isPaused ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={stop}
            disabled={!isPlaying}
            aria-label="Stop text-to-speech"
            data-testid="button-tts-stop"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={readCurrentPage}
            aria-label="Read entire page"
            data-testid="button-tts-read-page"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label htmlFor="tts-speed" className="text-sm font-medium">
            Speech Speed: {preferences.ttsRate.toFixed(1)}x
          </label>
          <Slider
            id="tts-speed"
            min={0.5}
            max={2.5}
            step={0.1}
            value={[preferences.ttsRate]}
            onValueChange={handleRateChange}
            className="w-full"
            aria-label="Text-to-speech speed"
            data-testid="slider-tts-speed"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.5x</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label htmlFor="tts-voice" className="text-sm font-medium">
            Voice
          </label>
          <Select value={preferences.ttsVoice || "default"} onValueChange={handleVoiceChange}>
            <SelectTrigger data-testid="select-tts-voice">
              <SelectValue placeholder="Select voice" />
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
        </div>

        {/* Status */}
        <div className="text-sm text-muted-foreground">
          <div>Status: {isPlaying 
            ? isPaused 
              ? "Paused" 
              : "Playing"
            : "Stopped"
          }</div>
          <div>Voices: {voices.length} available</div>
          {!isInitialized && (
            <div className="text-yellow-600 mt-1">
              Click any button to initialize text-to-speech
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
