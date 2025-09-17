import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface UseVoiceInputParams {
  onVoiceCommand?: (command: any) => void;
}

interface VoiceCommand {
  type: string;
  action: string;
  confidence: number;
  value?: any;
  suggestions?: string[];
}

export function usePythonVoiceInput(params: UseVoiceInputParams = {}) {
  const { onVoiceCommand } = params;
  
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if browser supports required APIs
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      
      console.log('Python Voice Input Setup:', {
        hasMediaDevices,
        hasMediaRecorder,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol
      });
      
      if (hasMediaDevices && hasMediaRecorder) {
        setIsSupported(true);
        console.log('Python voice input initialized successfully');
      } else {
        console.warn('Python voice input not supported - missing MediaRecorder or getUserMedia');
        setError('Voice input requires a modern browser with microphone support.');
      }
    };

    checkSupport();
  }, []);

  const startListening = useCallback(async (options: VoiceInputOptions = {}) => {
    console.log('Python voice: Start listening called:', { isListening, options });
    
    if (!isSupported) {
      setError('Voice input not supported in this browser');
      return;
    }
    
    if (isListening) {
      console.warn('Already listening, ignoring start request');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Create MediaRecorder for high-quality audio capture
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        
        if (audioChunksRef.current.length > 0) {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Send to Python backend for recognition
          await processAudioWithPython(audioBlob);
        }
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setIsListening(false);
      };
      
      mediaRecorder.start();
      setIsListening(true);
      console.log('Python voice recording started');
      
      // Auto-stop after 5 seconds for better UX
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (err) {
      console.error('Failed to start voice recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsListening(false);
    }
  }, [isSupported, isListening, onVoiceCommand]);

  const stopListening = useCallback(() => {
    console.log('Python voice: Stop listening called');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processAudioWithPython = async (audioBlob: Blob) => {
    try {
      console.log('Sending audio to Python backend...');
      
      // Convert webm to wav for better compatibility
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      // Add timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('http://localhost:8000/api/speech/recognize', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Speech recognition failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Python speech recognition result:', result);
      
      if (result.success && result.text) {
        setTranscript(result.text);
        
        // Process the command if recognized
        if (result.command && result.command.type !== 'unknown') {
          setLastCommand(result.command);
          
          if (onVoiceCommand) {
            console.log('Executing voice command via Python backend');
            onVoiceCommand(result.command);
          }
        } else {
          console.log('Command not recognized by Python backend:', result.text);
          if (result.command && result.command.suggestions) {
            setError(`Command not recognized. ${result.command.suggestions.join(' ')}`);
          } else {
            setError('Command not recognized. Try saying "help" for available commands.');
          }
        }
      } else {
        setError('No speech detected. Please speak clearly and try again.');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Python speech recognition error:', errorMessage);
      
      // Check if it's a connection/timeout error
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('AbortError')) {
        setError('Python speech service unavailable. Please try again or use browser voice input.');
      } else {
        setError('Speech recognition failed. Please try again.');
      }
    }
  };

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setLastCommand(null);
  }, []);

  // Text-to-speech using Python backend
  const speakText = useCallback(async (text: string, options: any = {}) => {
    try {
      console.log('Python TTS: Speaking text:', text);
      
      const response = await fetch('http://localhost:8000/api/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          engine: options.engine || 'pyttsx3',
          rate: options.rate || 180,
          voice_id: options.voiceId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }
      
      // Play the audio response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log('Python TTS: Audio played successfully');
      
    } catch (err) {
      console.error('Python TTS error:', err);
      setError('Text-to-speech failed.');
    }
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    lastCommand,
    startListening,
    stopListening,
    resetTranscript,
    speakText,
    processVoiceCommand: useCallback((text: string) => {
      // For compatibility with existing components
      return { type: 'unknown', action: null };
    }, [])
  };
}