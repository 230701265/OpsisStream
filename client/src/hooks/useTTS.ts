import { useState, useEffect, useCallback } from 'react';

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

export function useTTS() {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        console.log('TTS: Loaded voices:', availableVoices.length);
        setVoices(availableVoices);
        
        // Mark as initialized once voices are loaded
        if (availableVoices.length > 0) {
          setIsInitialized(true);
        }
      };

      // Load voices immediately
      loadVoices();
      
      // Also listen for voice changes (some browsers load them asynchronously)
      speechSynthesis.addEventListener('voiceschanged', loadVoices);

      // Fallback: try loading voices after a delay if none are found initially
      const fallbackTimer = setTimeout(() => {
        if (voices.length === 0) {
          loadVoices();
        }
      }, 1000);

      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  // Initialize TTS with user interaction to bypass autoplay restrictions
  const initializeTTS = useCallback(() => {
    if (!isSupported || isInitialized) return;

    try {
      // Create a silent utterance to initialize the speech synthesis
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0;
      speechSynthesis.speak(testUtterance);
      speechSynthesis.cancel();
      setIsInitialized(true);
      console.log('TTS: Initialized successfully');
    } catch (error) {
      console.error('TTS: Initialization failed:', error);
    }
  }, [isSupported, isInitialized]);

  const speak = useCallback((text: string, options: TTSOptions = {}) => {
    if (!isSupported || !text.trim()) {
      console.log('TTS: Cannot speak - not supported or empty text');
      return;
    }

    // Initialize TTS if needed (handles autoplay restrictions)
    if (!isInitialized) {
      initializeTTS();
    }

    try {
      // Stop any current speech
      speechSynthesis.cancel();
      
      // Wait a brief moment for cancel to complete
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.rate = options.rate || 1.2; // Default to 1.2x speed for accessibility
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        
        // Set voice if specified
        if (options.voice) {
          utterance.voice = options.voice;
        } else if (voices.length > 0) {
          // Use first available voice as fallback
          utterance.voice = voices[0];
        }

        utterance.onstart = () => {
          console.log('TTS: Speech started');
          setIsPlaying(true);
          setIsPaused(false);
        };

        utterance.onend = () => {
          console.log('TTS: Speech ended');
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentUtterance(null);
        };

        utterance.onpause = () => {
          console.log('TTS: Speech paused');
          setIsPaused(true);
        };

        utterance.onresume = () => {
          console.log('TTS: Speech resumed');
          setIsPaused(false);
        };

        utterance.onerror = (event) => {
          console.error('TTS Error:', event.error);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentUtterance(null);
        };

        setCurrentUtterance(utterance);
        speechSynthesis.speak(utterance);
        console.log('TTS: Speaking text:', text.substring(0, 100) + '...');
      }, 50);

    } catch (error) {
      console.error('TTS: Failed to speak:', error);
    }
  }, [isSupported, isInitialized, initializeTTS, voices]);

  const pause = useCallback(() => {
    if (!isSupported) return;

    try {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        setIsPaused(true);
        console.log('TTS: Paused');
      } else {
        console.log('TTS: Cannot pause - not speaking or already paused');
      }
    } catch (error) {
      console.error('TTS Pause Error:', error);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;

    try {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        setIsPaused(false);
        console.log('TTS: Resumed');
      } else {
        console.log('TTS: Cannot resume - not paused');
      }
    } catch (error) {
      console.error('TTS Resume Error:', error);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;

    try {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentUtterance(null);
      console.log('TTS: Stopped');
    } catch (error) {
      console.error('TTS Stop Error:', error);
    }
  }, [isSupported]);

  const toggle = useCallback(() => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    }
  }, [isPlaying, isPaused, pause, resume]);

  return {
    isSupported,
    isPlaying,
    isPaused,
    voices,
    speak,
    pause,
    resume,
    stop,
    toggle,
    initializeTTS,
    isInitialized,
  };
}
