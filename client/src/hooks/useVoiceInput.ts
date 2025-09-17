import { useState, useCallback, useEffect } from 'react';

interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface UseVoiceInputParams {
  onVoiceCommand?: (command: any) => void;
}

export function useVoiceInput(params: UseVoiceInputParams = {}) {
  const { onVoiceCommand } = params;
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [lastCommand, setLastCommand] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      console.log('Voice Recognition Setup:', {
        hasSpeechRecognition: !!SpeechRecognition,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol
      });
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognitionInstance = new SpeechRecognition();
        setRecognition(recognitionInstance);
        console.log('Voice recognition initialized successfully');
      } else {
        console.warn('Speech Recognition not supported in this browser');
        setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    }
  }, []);

  const startListening = useCallback((options: VoiceInputOptions = {}) => {
    console.log('Start listening called:', { hasRecognition: !!recognition, isListening, options });
    
    if (!recognition) {
      console.error('No recognition instance available');
      setError('Voice recognition not initialized. Please refresh the page and try again.');
      return;
    }
    
    if (isListening) {
      console.warn('Already listening, ignoring start request');
      return;
    }

    // Check if we're on HTTPS (required for microphone access)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setError('Voice input requires HTTPS. Please use a secure connection.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.lang = options.language || 'en-US';

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      console.log('Voice recognition result:', event.results);
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        setTranscript(prev => prev + finalTranscript);
        
        // Process the command immediately when we get final transcript
        console.log('Processing voice command...');
        
        // Inline command processing for immediate execution
        const normalizedCommand = finalTranscript.toLowerCase().trim();
        const cleanCommand = normalizedCommand.replace(/\b(uh|um|please|now|can you|could you|i want to|i would like to|go ahead and)\b/g, '').trim();
        
        let command: any = { type: 'unknown', action: null };
        
        // Global navigation commands
        if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(exams?|exam list|test list|available exams)\b/) ||
            cleanCommand.match(/^(exams?|tests?)$/)) {
          command = { type: 'navigation', action: 'exams' };
        } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(home|dashboard|main page|main menu)\b/) ||
                   cleanCommand.match(/^(home|dashboard|main)$/)) {
          command = { type: 'navigation', action: 'home' };
        } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(results?|scores?|grades?|my results)\b/) ||
                   cleanCommand.match(/^(results?|scores?|grades?)$/)) {
          command = { type: 'navigation', action: 'results' };
        } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(settings?|accessibility|preferences|options)\b/) ||
                   cleanCommand.match(/^(settings?|accessibility|preferences|options)$/)) {
          command = { type: 'navigation', action: 'settings' };
        } else if (cleanCommand.match(/\b(help|voice commands|commands|instructions)\b/)) {
          command = { type: 'navigation', action: 'help' };
        } else if (cleanCommand.match(/\b(read|speak)\s+(page|content|text)\b/) || cleanCommand.match(/^(read page|speak page)$/)) {
          command = { type: 'accessibility', action: 'read_page' };
        } else if (cleanCommand.match(/\b(stop|cancel|halt)\s+(reading|speaking)\b/) || cleanCommand.match(/^(stop reading|stop speaking)$/)) {
          command = { type: 'accessibility', action: 'stop_reading' };
        } else if (cleanCommand.match(/\b(change|switch|cycle)\s+(theme|color|appearance)\b/) || cleanCommand.match(/^(change theme|switch theme)$/)) {
          command = { type: 'accessibility', action: 'change_theme' };
        }
        
        console.log('Processed voice command:', command);
        
        // Execute the command if it was recognized
        if (command && command.type !== 'unknown') {
          if (onVoiceCommand) {
            console.log('Executing voice command via callback');
            onVoiceCommand(command);
          }
        } else {
          console.log('Command not recognized:', finalTranscript);
        }
      }
      setInterimTranscript(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error, event);
      let userFriendlyError = event.error;
      
      switch (event.error) {
        case 'not-allowed':
          userFriendlyError = 'Microphone access denied. Please allow microphone permissions and try again.';
          break;
        case 'no-speech':
          // Don't show error for no-speech - just restart automatically
          console.log('No speech detected, restarting...');
          setTimeout(() => {
            if (recognition && !isListening) {
              try {
                recognition.start();
              } catch (e) {
                console.log('Could not restart recognition');
              }
            }
          }, 1000);
          return; // Don't set error
        case 'network':
          userFriendlyError = 'Network error. Please check your internet connection and try again.';
          break;
        case 'audio-capture':
          userFriendlyError = 'No microphone found. Please check your microphone is connected.';
          break;
        case 'aborted':
          userFriendlyError = 'Voice input was cancelled.';
          break;
      }
      
      setError(userFriendlyError);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setInterimTranscript('');
    };

    try {
      console.log('Starting voice recognition...');
      recognition.start();
    } catch (err) {
      setError('Failed to start voice recognition');
      setIsListening(false);
    }
  }, [recognition, isListening, onVoiceCommand]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Enhanced voice commands for comprehensive exam navigation and control
  const processVoiceCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Remove common filler words that might interfere with command recognition
    const cleanCommand = normalizedCommand.replace(/\b(uh|um|please|now|can you|could you|i want to|i would like to|go ahead and)\b/g, '').trim();
    
    // Exam-specific navigation commands - Enhanced with more variations
    if (cleanCommand.match(/\b(next|forward|advance|move ahead|go forward|skip to next)\b.*question/) || 
        cleanCommand.match(/^(next|forward)$/)) {
      return { type: 'navigation', action: 'next' };
    } else if (cleanCommand.match(/\b(previous|back|go back|move back|prior|earlier)\b.*question/) || 
               cleanCommand.match(/^(back|previous)$/)) {
      return { type: 'navigation', action: 'previous' };
    } else if (cleanCommand.match(/\b(go to|jump to|navigate to|show me)\b.*\b(question|number|item)\s*(\d+)/) ||
               cleanCommand.match(/^\b(question|number)\s*(\d+)$/)) {
      const match = cleanCommand.match(/\b(question|number|item)\s*(\d+)/);
      const questionNumber = match ? parseInt(match[2]) : null;
      return { type: 'navigation', action: 'goto', value: questionNumber };
    } else if (cleanCommand.match(/\b(first|beginning|start|initial)\b.*question/) || 
               cleanCommand.match(/^(first|start)$/)) {
      return { type: 'navigation', action: 'first' };
    } else if (cleanCommand.match(/\b(last|final|end)\b.*question/) || 
               cleanCommand.match(/^(last|end|final)$/)) {
      return { type: 'navigation', action: 'last' };
    }
    
    // Global navigation commands - Enhanced with shortcuts and natural speech
    else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(home|dashboard|main page|main menu)\b/) ||
             cleanCommand.match(/^(home|dashboard|main)$/)) {
      return { type: 'navigation', action: 'home' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(exams?|exam list|test list|available exams)\b/) ||
               cleanCommand.match(/^(exams?|tests?)$/)) {
      return { type: 'navigation', action: 'exams' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(results?|scores?|grades?|my results)\b/) ||
               cleanCommand.match(/^(results?|scores?|grades?)$/)) {
      return { type: 'navigation', action: 'results' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(settings?|accessibility|preferences|options)\b/) ||
               cleanCommand.match(/^(settings?|accessibility|preferences|options)$/)) {
      return { type: 'navigation', action: 'settings' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(authoring?|create|make exam|new exam|exam creation)\b/) ||
               cleanCommand.match(/^(create|authoring?|make exam)$/)) {
      return { type: 'navigation', action: 'authoring' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(admin|administration|manage)\b/) ||
               cleanCommand.match(/^(admin|administration|manage)$/)) {
      return { type: 'navigation', action: 'admin' };
    } else if (cleanCommand.match(/\b(go|navigate|take me|show me)\s*(to\s*)?(help|assistance|guide|commands)\b/) ||
               cleanCommand.match(/^(help|assistance|guide|commands)$/)) {
      return { type: 'navigation', action: 'help' };
    }
    
    // Answer selection commands (multiple choice) - Enhanced with phonetic and natural variations
    else if (cleanCommand.match(/\b(option|answer|select|choose|pick|take|letter|alpha)\s*(a|ay|eh)\b/) ||
             cleanCommand.match(/^(a|ay|alpha)$/) || cleanCommand.match(/\bfirst\s*(option|choice)\b/)) {
      return { type: 'answer', value: 'a', questionType: 'multiple_choice' };
    } else if (cleanCommand.match(/\b(option|answer|select|choose|pick|take|letter|bravo)\s*(b|be|bee)\b/) ||
               cleanCommand.match(/^(b|be|bee|bravo)$/) || cleanCommand.match(/\bsecond\s*(option|choice)\b/)) {
      return { type: 'answer', value: 'b', questionType: 'multiple_choice' };
    } else if (cleanCommand.match(/\b(option|answer|select|choose|pick|take|letter|charlie)\s*(c|see|sea)\b/) ||
               cleanCommand.match(/^(c|see|sea|charlie)$/) || cleanCommand.match(/\bthird\s*(option|choice)\b/)) {
      return { type: 'answer', value: 'c', questionType: 'multiple_choice' };
    } else if (cleanCommand.match(/\b(option|answer|select|choose|pick|take|letter|delta)\s*(d|dee)\b/) ||
               cleanCommand.match(/^(d|dee|delta)$/) || cleanCommand.match(/\bfourth\s*(option|choice)\b/)) {
      return { type: 'answer', value: 'd', questionType: 'multiple_choice' };
    } else if (cleanCommand.match(/\b(option|answer|select|choose|pick|take|letter|echo)\s*(e|ee)\b/) ||
               cleanCommand.match(/^(e|ee|echo)$/) || cleanCommand.match(/\bfifth\s*(option|choice)\b/)) {
      return { type: 'answer', value: 'e', questionType: 'multiple_choice' };
    }
    
    // True/False commands - Enhanced with natural speech patterns
    else if (cleanCommand.match(/\b(select|choose|answer|pick|take|go with|it's)\s*(true|yes|correct|right|affirmative)\b/) ||
             cleanCommand.match(/^(true|yes|yep|yeah|correct|right)$/) ||
             cleanCommand.match(/\b(that's|it is|this is)\s*(true|correct|right)\b/)) {
      return { type: 'answer', value: 'true', questionType: 'true_false' };
    } else if (cleanCommand.match(/\b(select|choose|answer|pick|take|go with|it's)\s*(false|no|incorrect|wrong|negative)\b/) ||
               cleanCommand.match(/^(false|no|nope|incorrect|wrong)$/) ||
               cleanCommand.match(/\b(that's|it is|this is)\s*(false|incorrect|wrong)\b/)) {
      return { type: 'answer', value: 'false', questionType: 'true_false' };
    }
    
    // Action commands - Enhanced with natural language and shortcuts
    else if (cleanCommand.match(/\b(submit|finish|complete|turn in|hand in|done|finished|end exam)\b/) ||
             cleanCommand.match(/^(submit|finish|done|complete)$/)) {
      return { type: 'action', action: 'submit' };
    } else if (cleanCommand.match(/\b(save|record|store|keep)\b.*answer/) ||
               cleanCommand.match(/^(save|record)$/)) {
      return { type: 'action', action: 'save' };
    } else if (cleanCommand.match(/\b(flag|mark|bookmark|note|remember)\b.*question/) ||
               cleanCommand.match(/^(flag|mark)$/)) {
      return { type: 'action', action: 'flag' };
    } else if (cleanCommand.match(/\b(unflag|unmark|remove flag|clear flag|remove mark)\b.*question/) ||
               cleanCommand.match(/^(unflag|unmark)$/)) {
      return { type: 'action', action: 'unflag' };
    } else if (cleanCommand.match(/\b(clear|delete|remove|erase|undo)\b.*(answer|selection|choice)/) ||
               cleanCommand.match(/^(clear|delete|remove)$/)) {
      return { type: 'action', action: 'clear' };
    }
    
    // Accessibility and reading commands
    else if (normalizedCommand.match(/\b(read|speak)\b.*question/)) {
      return { type: 'accessibility', action: 'read_question' };
    } else if (normalizedCommand.match(/\b(read|speak)\b.*options/)) {
      return { type: 'accessibility', action: 'read_options' };
    } else if (normalizedCommand.match(/\b(read|speak)\b.*instructions/)) {
      return { type: 'accessibility', action: 'read_instructions' };
    } else if (normalizedCommand.match(/\b(read|speak)\b.*(page|content)/)) {
      return { type: 'accessibility', action: 'read_page' };
    } else if (normalizedCommand.match(/\bstop\b.*(reading|speaking)/)) {
      return { type: 'accessibility', action: 'stop_reading' };
    } else if (normalizedCommand.match(/\brepeat\b/)) {
      return { type: 'accessibility', action: 'repeat' };
    } else if (normalizedCommand.match(/\b(increase|bigger|larger)\b.*font/)) {
      return { type: 'accessibility', action: 'increase_font' };
    } else if (normalizedCommand.match(/\b(decrease|smaller)\b.*font/)) {
      return { type: 'accessibility', action: 'decrease_font' };
    } else if (normalizedCommand.match(/\breset\b.*font/)) {
      return { type: 'accessibility', action: 'reset_font' };
    } else if (normalizedCommand.match(/\b(change|switch)\b.*theme/)) {
      return { type: 'accessibility', action: 'change_theme' };
    }
    
    // Progress and status commands
    else if (normalizedCommand.match(/\b(time|timer|remaining)/)) {
      return { type: 'status', action: 'time' };
    } else if (normalizedCommand.match(/\bprogress/)) {
      return { type: 'status', action: 'progress' };
    } else if (normalizedCommand.match(/\b(question|current)\s*number/)) {
      return { type: 'status', action: 'current_question' };
    } else if (normalizedCommand.match(/\btotal\s*questions/)) {
      return { type: 'status', action: 'total_questions' };
    } else if (normalizedCommand.match(/\b(answered|completed)\s*questions/)) {
      return { type: 'status', action: 'answered_count' };
    } else if (normalizedCommand.match(/\bflagged\s*questions/)) {
      return { type: 'status', action: 'flagged_count' };
    }
    
    // Help commands - Enhanced with more natural requests
    else if (cleanCommand.match(/\b(help|assistance|commands|what can i say|how do i|guide|instructions)\b/) ||
             cleanCommand.match(/\b(what|which|show me|list)\s*(commands|options|actions|things i can say)\b/) ||
             cleanCommand.match(/^(help|commands|guide)$/)) {
      return { type: 'help', action: 'voice_commands' };
    }
    
    // Smart suggestion system - analyze failed commands and suggest alternatives
    else {
      const suggestions = getCommandSuggestions(cleanCommand);
      if (suggestions.length > 0) {
        return { 
          type: 'suggestion', 
          action: 'command_not_recognized', 
          originalCommand: command,
          suggestions: suggestions
        };
      }
      
      // If no command matches and no good suggestions, treat as text input for essay/short answer questions
      return { type: 'text', value: command };
    }
  }, []);

  // Smart command suggestion system
  const getCommandSuggestions = useCallback((command: string) => {
    const suggestions = [];
    
    // Navigation suggestions
    if (command.match(/\b(move|go|navigate|change|switch)\b/) && !command.match(/\b(question|home|exam|result|setting)\b/)) {
      suggestions.push('Try: "next question", "go home", "go to exams", or "go to results"');
    }
    
    // Answer suggestions  
    if (command.match(/\b(answer|select|choose|pick)\b/) && !command.match(/\b(a|b|c|d|e|true|false)\b/)) {
      suggestions.push('Try: "option A", "option B", "answer true", or "answer false"');
    }
    
    // Action suggestions
    if (command.match(/\b(do|make|perform|execute)\b/) && !command.match(/\b(submit|save|flag|clear)\b/)) {
      suggestions.push('Try: "submit exam", "save answer", "flag question", or "clear answer"');
    }
    
    // Reading suggestions
    if (command.match(/\b(read|speak|say|tell)\b/) && !command.match(/\b(question|option|page|instruction)\b/)) {
      suggestions.push('Try: "read question", "read options", "read page", or "stop reading"');
    }
    
    // Status suggestions
    if (command.match(/\b(how|what|when|status|info|information)\b/) && !command.match(/\b(time|progress|question|total|answered|flagged)\b/)) {
      suggestions.push('Try: "time", "progress", "current question", or "total questions"');
    }
    
    // Common misspellings and variations
    if (command.match(/\b(nex|neat|nets)\b/)) suggestions.push('Did you mean: "next"?');
    if (command.match(/\b(previou|previus|back)\b/)) suggestions.push('Did you mean: "previous"?');
    if (command.match(/\b(optio|optin|opton)\b/)) suggestions.push('Did you mean: "option"?');
    if (command.match(/\b(submitt|sumbit|sibmit)\b/)) suggestions.push('Did you mean: "submit"?');
    
    return suggestions.slice(0, 2); // Limit to 2 suggestions to avoid overwhelming
  }, []);

  // Enhanced voice command processor with feedback
  const processVoiceCommandWithFeedback = useCallback((command: string) => {
    const processedCommand = processVoiceCommand(command);
    setLastCommand(processedCommand);
    return processedCommand;
  }, [processVoiceCommand]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    lastCommand,
    startListening,
    stopListening,
    resetTranscript,
    processVoiceCommand: processVoiceCommandWithFeedback,
  };
}
