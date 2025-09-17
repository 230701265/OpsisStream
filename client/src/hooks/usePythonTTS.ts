import { useState, useCallback, useEffect } from 'react';

interface TTSVoice {
  id: string;
  name: string;
  languages: string[];
  gender: string;
  age: string;
}

interface TTSOptions {
  rate?: number;
  voiceId?: string;
  engine?: 'pyttsx3' | 'gtts';
}

export function usePythonTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Load available voices from Python backend
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/speech/voices');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setVoices(result.voices);
          console.log('Python TTS: Loaded voices:', result.voices.length);
        } else {
          throw new Error('Voice loading failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
        console.warn('Python TTS service not available - using fallback:', errorMessage);
        // Set fallback voices when Python service is not available
        setVoices([
          {
            id: 'gtts-fallback',
            name: 'Google TTS (Fallback)',
            languages: ['en'],
            gender: 'neutral',
            age: 'adult'
          }
        ]);
        setIsSupported(true); // Still supported via fallback
      }
    };

    loadVoices();
  }, []);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    try {
      if (!text.trim()) return;

      console.log('Python TTS: Speaking:', text);
      setIsPlaying(true);
      setIsPaused(false);

      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      try {
        // Try Python backend first with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('http://localhost:8000/api/speech/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            engine: options.engine || 'gtts', // Use gtts as default for better reliability
            rate: options.rate || 180,
            voice_id: options.voiceId
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
        }

        // Create audio from response
        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
          throw new Error('Received empty audio response');
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setCurrentAudio(audio);

        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
          setCurrentAudio(null);
        };

        audio.onerror = (e) => {
          setIsPlaying(false);
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
          setCurrentAudio(null);
          console.error('Audio playback error:', e);
          
          // Fallback to browser TTS on audio error
          fallbackToBrowserTTS(text, options);
        };

        await audio.play();
        console.log('Python TTS: Audio playing successfully');

      } catch (pythonError) {
        const errorMessage = pythonError instanceof Error ? pythonError.message : 'Unknown error';
        console.warn('Python TTS failed, falling back to browser TTS:', errorMessage);
        
        // Fallback to browser TTS
        fallbackToBrowserTTS(text, options);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('All TTS options failed:', errorMessage);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [currentAudio]);

  // Helper function for browser TTS fallback
  const fallbackToBrowserTTS = useCallback((text: string, options: TTSOptions = {}) => {
    try {
      if ('speechSynthesis' in window) {
        // Clear any existing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Math.min(Math.max((options.rate || 180) / 200, 0.1), 10); // Convert and clamp rate
        utterance.volume = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
          console.log('Browser TTS: Started speaking');
        };
        
        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
          console.log('Browser TTS: Finished speaking');
        };
        
        utterance.onerror = (event) => {
          setIsPlaying(false);
          setIsPaused(false);
          console.error('Browser TTS error:', event.error);
        };
        
        window.speechSynthesis.speak(utterance);
        console.log('Using browser TTS fallback');
      } else {
        console.error('No TTS options available');
        setIsPlaying(false);
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Browser TTS fallback failed:', err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      setIsPaused(true);
      console.log('Python TTS: Paused');
    }
  }, [currentAudio]);

  const resume = useCallback(() => {
    if (currentAudio && currentAudio.paused) {
      currentAudio.play();
      setIsPaused(false);
      console.log('Python TTS: Resumed');
    }
  }, [currentAudio]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      console.log('Python TTS: Stopped');
    }
  }, [currentAudio]);

  return {
    isSupported,
    isPlaying,
    isPaused,
    voices,
    speak,
    pause,
    resume,
    stop
  };
}