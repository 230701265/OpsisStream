import { useState, useEffect, useCallback } from 'react';
import { useTTS } from './useTTS';
import { isNavigationModifierPressed, isActionModifierPressed, isMac } from '@/lib/platform';

interface AccessibilityPreferences {
  theme: 'default' | 'dark' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  ttsRate: number;
  ttsVoice: string | null;
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderAnnouncements: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
  theme: 'default',
  fontSize: 'medium',
  ttsRate: 1.2,
  ttsVoice: null,
  reducedMotion: false,
  highContrast: false,
  screenReaderAnnouncements: true,
};

export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasAutoAnnouncedPage, setHasAutoAnnouncedPage] = useState(false);
  const { speak, voices, initializeTTS, isInitialized } = useTTS();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('opsis-accessibility-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Failed to parse accessibility preferences:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('opsis-accessibility-preferences', JSON.stringify(preferences));
    }
  }, [preferences, isLoaded]);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }
  }, [preferences.theme]);

  // Apply font size
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', preferences.fontSize);
    }
  }, [preferences.fontSize]);

  // Apply reduced motion
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (preferences.reducedMotion) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      } else {
        document.documentElement.style.removeProperty('--animation-duration');
      }
    }
  }, [preferences.reducedMotion]);

  // Auto-announce page content when loaded
  useEffect(() => {
    if (isLoaded && !hasAutoAnnouncedPage && preferences.screenReaderAnnouncements) {
      // Delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        const pageTitle = document.title || 'OPSIS - Accessible Exam Platform';
        const mainHeading = document.querySelector('h1, h2')?.textContent;
        const announcement = mainHeading 
          ? `Welcome to ${pageTitle}. Current page: ${mainHeading}`
          : `Welcome to ${pageTitle}`;
        
        announceForScreenReader(announcement);
        
        // Also auto-start TTS if enabled
        const shouldAutoRead = localStorage.getItem('opsis-auto-tts') !== 'false';
        if (shouldAutoRead) {
          setTimeout(() => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
              const contentText = mainContent.textContent || '';
              const cleanText = contentText.replace(/\s+/g, ' ').trim();
              if (cleanText && cleanText.length > 20) {
                speak(`Page loaded. ${cleanText.substring(0, 200)}${cleanText.length > 200 ? '... Press T to continue reading or S to stop.' : ''}`, {
                  rate: preferences.ttsRate
                });
              }
            }
          }, 2000);
        }
        
        setHasAutoAnnouncedPage(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded, hasAutoAnnouncedPage, preferences.screenReaderAnnouncements, preferences.ttsRate, speak]);

  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const cycleTheme = useCallback(() => {
    const themes: AccessibilityPreferences['theme'][] = ['default', 'dark', 'high-contrast'];
    const currentIndex = themes.indexOf(preferences.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    updatePreference('theme', themes[nextIndex]);
  }, [preferences.theme, updatePreference]);

  const announceForScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!preferences.screenReaderAnnouncements) return;

    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after a delay to ensure it's read
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [preferences.screenReaderAnnouncements]);

  const speakWithPreferences = useCallback((text: string) => {
    // Initialize TTS if not already done
    if (!isInitialized) {
      initializeTTS();
    }
    
    const selectedVoice = preferences.ttsVoice 
      ? voices.find(voice => voice.name === preferences.ttsVoice)
      : undefined;
    
    speak(text, {
      rate: preferences.ttsRate,
      voice: selectedVoice,
    });
  }, [speak, preferences.ttsRate, preferences.ttsVoice, voices, initializeTTS, isInitialized]);

  // Component navigation system (like NVDA/JAWS)
  const findElementsByType = useCallback((type: string): HTMLElement[] => {
    let elements: HTMLElement[] = [];
    
    switch (type) {
      case 'heading':
        elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
        break;
      case 'button':
        elements = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')) as HTMLElement[];
        break;
      case 'link':
        elements = Array.from(document.querySelectorAll('a[href]')) as HTMLElement[];
        break;
      case 'form':
        elements = Array.from(document.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"], [role="listbox"]')) as HTMLElement[];
        break;
      case 'landmark':
        elements = Array.from(document.querySelectorAll('main, nav, aside, header, footer, section, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]')) as HTMLElement[];
        break;
      case 'list':
        elements = Array.from(document.querySelectorAll('ul, ol, [role="list"]')) as HTMLElement[];
        break;
      case 'table':
        elements = Array.from(document.querySelectorAll('table, [role="table"]')) as HTMLElement[];
        break;
      case 'card':
        elements = Array.from(document.querySelectorAll('[data-testid^="card-"], .card, [role="article"]')) as HTMLElement[];
        break;
    }
    
    // Filter out hidden elements
    return elements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  }, []);

  const navigateToElementByType = useCallback((type: string, direction: 'next' | 'prev' = 'next') => {
    const elements = findElementsByType(type);
    if (elements.length === 0) {
      announceForScreenReader(`No ${type}s found on this page`);
      return;
    }

    const currentElement = document.activeElement as HTMLElement;
    let currentIndex = elements.indexOf(currentElement);
    
    if (currentIndex === -1) {
      currentIndex = direction === 'next' ? -1 : 0;
    }
    
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % elements.length
      : currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
      
    const targetElement = elements[nextIndex];
    
    // Make element focusable if it's not already
    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute('tabindex', '-1');
    }
    
    targetElement.focus();
    
    // Scroll into view
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Announce the element both via screen reader AND TTS
    const elementInfo = getElementDescription(targetElement, type);
    announceForScreenReader(elementInfo, 'assertive');
    speakWithPreferences(elementInfo);
    
  }, [findElementsByType, announceForScreenReader, speakWithPreferences]);

  const getElementDescription = useCallback((element: HTMLElement, type: string): string => {
    let description = '';
    
    // Get element text content
    const textContent = element.textContent?.trim() || '';
    const ariaLabel = element.getAttribute('aria-label') || '';
    const title = element.getAttribute('title') || '';
    const alt = element.getAttribute('alt') || '';
    
    const displayText = ariaLabel || title || alt || textContent;
    
    switch (type) {
      case 'heading':
        const level = element.tagName.toLowerCase().replace('h', '');
        description = `Heading level ${level}: ${displayText}`;
        break;
      case 'button':
        const disabled = element.hasAttribute('disabled') ? ' disabled' : '';
        description = `${displayText}${disabled} button`;
        break;
      case 'link':
        const href = element.getAttribute('href') || '';
        description = `${displayText} link${href ? ` to ${href}` : ''}`;
        break;
      case 'form':
        const tagName = element.tagName.toLowerCase();
        const inputType = element.getAttribute('type') || '';
        const required = element.hasAttribute('required') ? ' required' : '';
        description = `${displayText} ${inputType || tagName}${required} field`;
        break;
      case 'landmark':
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        description = `${displayText} ${role} landmark`;
        break;
      case 'list':
        const listItems = element.querySelectorAll('li, [role="listitem"]').length;
        description = `${displayText} list with ${listItems} items`;
        break;
      case 'table':
        const rows = element.querySelectorAll('tr, [role="row"]').length;
        const cols = element.querySelectorAll('th, td, [role="columnheader"], [role="cell"]').length;
        description = `${displayText} table with ${rows} rows`;
        break;
      case 'card':
        description = `${displayText} card`;
        break;
      default:
        description = displayText || `${type} element`;
    }
    
    return description;
  }, []);

  // Quick navigation commands (like NVDA/JAWS)
  const quickNavigation = useCallback((key: string, shift = false) => {
    const direction = shift ? 'prev' : 'next';
    
    switch (key.toLowerCase()) {
      case 'h':
        navigateToElementByType('heading', direction);
        break;
      case 'b':
        navigateToElementByType('button', direction);
        break;
      case 'k':
        navigateToElementByType('link', direction);
        break;
      case 'f':
        navigateToElementByType('form', direction);
        break;
      case 'r':
        navigateToElementByType('landmark', direction);
        break;
      case 'l':
        navigateToElementByType('list', direction);
        break;
      case 't':
        navigateToElementByType('table', direction);
        break;
      case 'c':
        navigateToElementByType('card', direction);
        break;
      default:
        announceForScreenReader(`Quick navigation key ${key} not recognized`);
    }
  }, [navigateToElementByType]);

  // Navigation helper functions
  const jumpToMainContent = useCallback(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
      announceForScreenReader('Jumped to main content');
    } else {
      announceForScreenReader('Main content not found');
    }
  }, [announceForScreenReader]);

  const jumpToNavigation = useCallback(() => {
    const nav = document.querySelector('nav, [role="navigation"]');
    if (nav) {
      (nav as HTMLElement).focus();
      announceForScreenReader('Jumped to navigation');
    } else {
      announceForScreenReader('Navigation not found');
    }
  }, [announceForScreenReader]);

  const navigateToHeading = useCallback((level: number) => {
    const headings = document.querySelectorAll(`h${level}`);
    if (headings.length > 0) {
      const firstHeading = headings[0] as HTMLElement;
      firstHeading.focus();
      const headingText = firstHeading.textContent || `Level ${level} heading`;
      announceForScreenReader(`Navigated to heading: ${headingText}`);
    } else {
      announceForScreenReader(`No level ${level} headings found`);
    }
  }, [announceForScreenReader]);

  // Font size controls
  const increaseFontSize = useCallback(() => {
    const currentSize = preferences.fontSize;
    const sizes: AccessibilityPreferences['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(currentSize);
    if (currentIndex < sizes.length - 1) {
      const newSize = sizes[currentIndex + 1];
      updatePreference('fontSize', newSize);
      announceForScreenReader(`Font size increased to ${newSize}`);
    } else {
      announceForScreenReader('Font size is already at maximum');
    }
  }, [preferences.fontSize, updatePreference, announceForScreenReader]);

  const decreaseFontSize = useCallback(() => {
    const currentSize = preferences.fontSize;
    const sizes: AccessibilityPreferences['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(currentSize);
    if (currentIndex > 0) {
      const newSize = sizes[currentIndex - 1];
      updatePreference('fontSize', newSize);
      announceForScreenReader(`Font size decreased to ${newSize}`);
    } else {
      announceForScreenReader('Font size is already at minimum');
    }
  }, [preferences.fontSize, updatePreference, announceForScreenReader]);

  const resetFontSize = useCallback(() => {
    updatePreference('fontSize', 'medium');
    announceForScreenReader('Font size reset to medium');
  }, [updatePreference, announceForScreenReader]);

  // TTS controls
  const toggleTTS = useCallback(() => {
    // Initialize TTS if needed
    if (!isInitialized) {
      initializeTTS();
    }
    
    const isSpeaking = speechSynthesis.speaking;
    const isPaused = speechSynthesis.paused;
    
    console.log('TTS Toggle:', { isSpeaking, isPaused, isInitialized });
    
    if (isSpeaking && !isPaused) {
      speechSynthesis.pause();
      announceForScreenReader('Text-to-speech paused');
    } else if (isSpeaking && isPaused) {
      speechSynthesis.resume();
      announceForScreenReader('Text-to-speech resumed');
    } else {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        const text = mainContent.textContent || '';
        const cleanText = text.replace(/\s+/g, ' ').trim();
        if (cleanText) {
          speakWithPreferences(cleanText);
          announceForScreenReader('Started reading page content');
        } else {
          speakWithPreferences('No readable content found on this page');
          announceForScreenReader('No content to read');
        }
      } else {
        speakWithPreferences('Unable to find main content');
        announceForScreenReader('Main content not found');
      }
    }
  }, [speakWithPreferences, announceForScreenReader, initializeTTS, isInitialized]);

  const stopTTS = useCallback(() => {
    speechSynthesis.cancel();
    announceForScreenReader('Text-to-speech stopped');
  }, [announceForScreenReader]);

  // Global voice navigation handler
  const handleGlobalVoiceCommand = useCallback((command: any) => {
    switch (command.type) {
      case 'navigation':
        if (command.action === 'home' || command.action === 'dashboard') {
          window.location.href = '/';
          announceForScreenReader('Navigating to dashboard');
        } else if (command.action === 'exams') {
          window.location.href = '/exams';
          announceForScreenReader('Navigating to exams page');
        } else if (command.action === 'results') {
          window.location.href = '/results';
          announceForScreenReader('Navigating to results page');
        } else if (command.action === 'settings') {
          window.location.href = '/accessibility-settings';
          announceForScreenReader('Opening accessibility settings');
        } else if (command.action === 'authoring' || command.action === 'create') {
          window.location.href = '/exam-authoring';
          announceForScreenReader('Navigating to exam authoring');
        } else if (command.action === 'admin') {
          window.location.href = '/admin';
          announceForScreenReader('Navigating to admin panel');
        } else if (command.action === 'help') {
          window.location.href = '/voice-commands-help';
          announceForScreenReader('Opening voice commands help page');
        }
        break;
        
      case 'accessibility':
        if (command.action === 'read_page') {
          const mainContent = document.querySelector('main');
          if (mainContent) {
            const text = mainContent.textContent || '';
            if (text.trim()) {
              speakWithPreferences(text);
            } else {
              announceForScreenReader('No content to read');
            }
          }
        } else if (command.action === 'stop_reading') {
          speechSynthesis.cancel();
          announceForScreenReader('Stopped reading');
        } else if (command.action === 'increase_font') {
          increaseFontSize();
        } else if (command.action === 'decrease_font') {
          decreaseFontSize();
        } else if (command.action === 'reset_font') {
          resetFontSize();
        } else if (command.action === 'change_theme') {
          cycleTheme();
          announceForScreenReader(`Theme changed to ${preferences.theme}`);
        }
        break;
        
      case 'help':
        if (command.action === 'voice_commands') {
          const helpText = `Global voice commands available: Say "go home" or "dashboard" to return to main page. Say "go to exams" to view available exams. Say "go to results" to see your exam results. Say "settings" for accessibility settings. Say "read page" to hear page content. Say "stop reading" to stop speech. Say "increase font", "decrease font", or "reset font" to adjust text size. Say "change theme" to switch themes. Say "help" for this information.`;
          speakWithPreferences(helpText);
        }
        break;
    }
  }, [announceForScreenReader, speakWithPreferences, preferences.theme, increaseFontSize, decreaseFontSize, resetFontSize, cycleTheme]);

  // Keyboard navigation helpers
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Prevent shortcuts when user is typing in input fields
    const isInInput = event.target instanceof HTMLInputElement || 
                     event.target instanceof HTMLTextAreaElement ||
                     (event.target instanceof HTMLElement && event.target.contentEditable === 'true');
    
    if (isInInput && !event.ctrlKey && !event.altKey) {
      return;
    }

    // Quick Navigation Keys (NVDA/JAWS style) - single letter navigation
    if (!event.ctrlKey && !event.altKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      const validQuickNavKeys = ['h', 'b', 'k', 'f', 'r', 'l', 't', 'c'];
      
      if (validQuickNavKeys.includes(key)) {
        event.preventDefault();
        quickNavigation(key, event.shiftKey);
        return;
      }
      
      // Pause/Resume TTS with P key
      if (key === 'p') {
        event.preventDefault();
        const isSpeaking = speechSynthesis.speaking;
        const isPaused = speechSynthesis.paused;
        
        console.log('P key pressed - TTS state:', { isSpeaking, isPaused });
        
        if (isSpeaking && !isPaused) {
          speechSynthesis.pause();
          announceForScreenReader('Text-to-speech paused');
          speakWithPreferences('Paused');
        } else if (isSpeaking && isPaused) {
          speechSynthesis.resume();
          announceForScreenReader('Text-to-speech resumed');
          speakWithPreferences('Resumed');
        } else {
          // If no TTS is active, start reading the page
          const mainContent = document.querySelector('main');
          if (mainContent) {
            const text = mainContent.textContent || '';
            if (text.trim()) {
              speakWithPreferences('Starting to read page content');
              setTimeout(() => {
                speakWithPreferences(text.substring(0, 500));
              }, 1000);
            } else {
              speakWithPreferences('No content to read on this page');
            }
          } else {
            speakWithPreferences('No main content found');
          }
        }
        return;
      }
    }

    // Global keyboard shortcuts with platform-appropriate navigation modifier
    if (isNavigationModifierPressed(event) && !event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case 'h':
          event.preventDefault();
          window.location.href = '/';
          announceForScreenReader('Navigating to dashboard');
          break;
        case 'e':
          event.preventDefault();
          window.location.href = '/exams';
          announceForScreenReader('Navigating to exams page');
          break;
        case 'r':
          event.preventDefault();
          window.location.href = '/results';
          announceForScreenReader('Navigating to results page');
          break;
        case 's':
          event.preventDefault();
          window.location.href = '/accessibility-settings';
          announceForScreenReader('Opening accessibility settings');
          break;
        case 'c':
          event.preventDefault();
          window.location.href = '/exam-authoring';
          announceForScreenReader('Navigating to exam authoring');
          break;
        case 'v':
          event.preventDefault();
          window.location.href = '/voice-commands-help';
          announceForScreenReader('Opening voice commands help');
          break;
        case 't':
          event.preventDefault();
          cycleTheme();
          announceForScreenReader(`Theme changed to ${preferences.theme}`);
          break;
        case 'k':
          event.preventDefault();
          jumpToMainContent();
          break;
        case 'l':
          event.preventDefault();
          jumpToNavigation();
          break;
        case ' ':
          event.preventDefault();
          toggleTTS();
          break;
        // Heading navigation shortcuts
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          event.preventDefault();
          navigateToHeading(parseInt(event.key));
          break;
      }
    }

    // Font size controls with platform-appropriate action modifier
    if (isActionModifierPressed(event) && !event.altKey && !event.shiftKey) {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          increaseFontSize();
          break;
        case '-':
          event.preventDefault();
          decreaseFontSize();
          break;
        case '0':
          event.preventDefault();
          resetFontSize();
          break;
      }
    }

    // TTS controls with Alt+Shift
    if (event.altKey && event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          stopTTS();
          break;
      }
    }

    // Skip navigation with Ctrl+Alt
    if (event.ctrlKey && event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'm':
          event.preventDefault();
          jumpToMainContent();
          break;
        case 'n':
          event.preventDefault();
          jumpToNavigation();
          break;
      }
    }

    // F1 for help
    if (event.key === 'F1') {
      event.preventDefault();
      window.location.href = '/voice-commands-help';
      announceForScreenReader('Opening voice commands help page');
    }

    // Escape to close modals/dialogs
    if (event.key === 'Escape') {
      const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
      if (modals.length > 0) {
        announceForScreenReader('Closing dialog');
      }
    }
  }, [announceForScreenReader, cycleTheme, preferences.theme]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  return {
    preferences,
    updatePreference,
    cycleTheme,
    announceForScreenReader,
    speakWithPreferences,
    jumpToMainContent,
    jumpToNavigation,
    navigateToHeading,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    toggleTTS,
    stopTTS,
    handleGlobalVoiceCommand,
    quickNavigation,
    findElementsByType,
    navigateToElementByType,
    isLoaded,
  };
}
