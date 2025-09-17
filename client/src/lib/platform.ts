/**
 * Platform detection and keyboard utility functions
 */

export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function isWindows(): boolean {
  return typeof navigator !== 'undefined' && /Win/.test(navigator.platform);
}

export function getPlatformModifierKey(): 'cmd' | 'ctrl' {
  return isMac() ? 'cmd' : 'ctrl';
}

export function getPlatformAltKey(): 'opt' | 'alt' {
  return isMac() ? 'opt' : 'alt';
}

/**
 * Format keyboard shortcut for display based on platform
 */
export function formatShortcut(shortcut: string): string {
  if (isMac()) {
    return shortcut
      .replace(/Ctrl/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/Enter/g, '↵')
      .replace(/\+/g, '');
  }
  return shortcut;
}

/**
 * Check if the correct modifier keys are pressed for the current platform
 */
export function isModifierPressed(event: KeyboardEvent, modifier: 'ctrl' | 'alt' | 'cmd' | 'opt'): boolean {
  const isMacPlatform = isMac();
  
  switch (modifier) {
    case 'ctrl':
      return isMacPlatform ? event.metaKey : event.ctrlKey;
    case 'cmd':
      return isMacPlatform ? event.metaKey : event.ctrlKey;
    case 'alt':
      return isMacPlatform ? event.altKey : event.altKey;
    case 'opt':
      return isMacPlatform ? event.altKey : event.altKey;
    default:
      return false;
  }
}

/**
 * Check if platform-appropriate navigation modifier is pressed
 */
export function isNavigationModifierPressed(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.altKey;
}

/**
 * Check if platform-appropriate action modifier is pressed (for things like save, copy, etc.)
 */
export function isActionModifierPressed(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}