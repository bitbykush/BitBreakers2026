'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type HighContrastMode = 'none' | 'yellow-black' | 'black-white';
export type FontSizeTier = 'normal' | 'large' | 'xlarge';

interface AccessibilityContextType {
  isA11yMenuOpen: boolean;
  setIsA11yMenuOpen: (open: boolean) => void;
  // High Contrast
  highContrast: HighContrastMode;
  setHighContrast: (mode: HighContrastMode) => void;
  // Zoom & Magnification
  zoomLevel: number; // 100, 125, 150, 175, 200
  setZoomLevel: (zoom: number) => void;
  magnifierLensActive: boolean;
  setMagnifierLensActive: (active: boolean) => void;
  // Text & Font
  fontSize: FontSizeTier;
  setFontSize: (size: FontSizeTier) => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (active: boolean) => void;
  // Reading Guide
  readingGuideActive: boolean;
  setReadingGuideActive: (active: boolean) => void;
  // TalkBack Screen Reader
  talkBackActive: boolean;
  setTalkBackActive: (active: boolean) => void;
  talkBackSpeed: number; // 0.75, 1.0, 1.25, 1.5
  setTalkBackSpeed: (speed: number) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  currentSpokenText: string;
  speakText: (text: string, priority?: boolean) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  // Global Reset
  resetDefaults: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'udyamsetu_a11y_prefs';

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isA11yMenuOpen, setIsA11yMenuOpen] = useState(false);
  const [highContrast, setHighContrast] = useState<HighContrastMode>('none');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [magnifierLensActive, setMagnifierLensActive] = useState(false);
  const [fontSize, setFontSize] = useState<FontSizeTier>('normal');
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [readingGuideActive, setReadingGuideActive] = useState(false);
  const [talkBackActive, setTalkBackActive] = useState(false);
  const [talkBackSpeed, setTalkBackSpeed] = useState(1.0);

  // TalkBack playback state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpokenText, setCurrentSpokenText] = useState('');

  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const hoverDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.highContrast) setHighContrast(parsed.highContrast);
        if (parsed.zoomLevel) setZoomLevel(parsed.zoomLevel);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (typeof parsed.dyslexiaFont === 'boolean') setDyslexiaFont(parsed.dyslexiaFont);
        if (typeof parsed.talkBackActive === 'boolean') setTalkBackActive(parsed.talkBackActive);
        if (parsed.talkBackSpeed) setTalkBackSpeed(parsed.talkBackSpeed);
        if (typeof parsed.readingGuideActive === 'boolean') setReadingGuideActive(parsed.readingGuideActive);
        if (typeof parsed.magnifierLensActive === 'boolean') setMagnifierLensActive(parsed.magnifierLensActive);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences on change
  useEffect(() => {
    try {
      const prefs = {
        highContrast,
        zoomLevel,
        fontSize,
        dyslexiaFont,
        talkBackActive,
        talkBackSpeed,
        readingGuideActive,
        magnifierLensActive,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, [
    highContrast,
    zoomLevel,
    fontSize,
    dyslexiaFont,
    talkBackActive,
    talkBackSpeed,
    readingGuideActive,
    magnifierLensActive,
  ]);

  // Apply CSS classes to documentElement
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // High Contrast classes
    root.classList.remove('a11y-contrast-yellow', 'a11y-contrast-mono');
    if (highContrast === 'yellow-black') {
      root.classList.add('a11y-contrast-yellow');
    } else if (highContrast === 'black-white') {
      root.classList.add('a11y-contrast-mono');
    }

    // Font Size classes
    root.classList.remove('a11y-font-large', 'a11y-font-xlarge');
    if (fontSize === 'large') {
      root.classList.add('a11y-font-large');
    } else if (fontSize === 'xlarge') {
      root.classList.add('a11y-font-xlarge');
    }

    // Dyslexia Font class
    if (dyslexiaFont) {
      root.classList.add('a11y-dyslexia');
    } else {
      root.classList.remove('a11y-dyslexia');
    }

    // Zoom Level
    if (zoomLevel !== 100) {
      // Modern CSS zoom support
      (document.body.style as any).zoom = `${zoomLevel}%`;
    } else {
      (document.body.style as any).zoom = '100%';
    }
  }, [highContrast, fontSize, dyslexiaFont, zoomLevel]);

  // Speech helper: Select best voice
  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Detect page language or fallback
    const lang = document.documentElement.lang || 'en';
    if (lang.startsWith('hi')) {
      // Find Hindi voice
      const hindiVoice = voices.find((v) => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
      if (hindiVoice) return hindiVoice;
    }

    // Find Indian English voice or general English
    const inEnVoice = voices.find((v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india'));
    if (inEnVoice) return inEnVoice;

    const enVoice = voices.find((v) => v.lang.startsWith('en'));
    return enVoice || voices[0];
  }, []);

  const pauseSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSpokenText('');
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove('talkback-speaking-outline');
        highlightedElementRef.current = null;
      }
    }
  }, []);

  // TalkBack Speak function
  const speakText = useCallback(
    (text: string, priority = false) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (!text || text.trim().length === 0) return;

      const synth = window.speechSynthesis;

      if (priority || synth.speaking) {
        synth.cancel();
      }

      const cleanText = text
        .replace(/[^\w\s\u0900-\u097F₹%.,\-–—()]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;

      utterance.rate = talkBackSpeed;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setCurrentSpokenText(cleanText);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpokenText('');
        if (highlightedElementRef.current) {
          highlightedElementRef.current.classList.remove('talkback-speaking-outline');
          highlightedElementRef.current = null;
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      synth.speak(utterance);
    },
    [talkBackSpeed, getBestVoice]
  );

  // Keyboard shortcut listener: Alt+A (open menu), Alt+T (toggle TalkBack), Escape (stop speech)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsA11yMenuOpen((prev) => !prev);
      } else if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setTalkBackActive((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isSpeaking) {
          stopSpeech();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpeaking, stopSpeech]);

  // TalkBack Announcement on toggle
  useEffect(() => {
    if (talkBackActive) {
      speakText('TalkBack screen reader activated. Move cursor or press tab to explore.', true);
    } else {
      stopSpeech();
    }
  }, [talkBackActive, speakText, stopSpeech]);

  // TalkBack Mouse & Focus Explorer Listener
  useEffect(() => {
    if (!talkBackActive || typeof document === 'undefined') return;

    const extractReadableText = (el: HTMLElement): string => {
      // 1. aria-label or title
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!;
      if (el.title) return el.title;

      // 2. Buttons / Links
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        return `${el.tagName === 'A' ? 'Link' : 'Button'}: ${el.innerText.trim()}`;
      }

      // 3. Headings
      if (/^H[1-6]$/.test(el.tagName)) {
        return `Heading: ${el.innerText.trim()}`;
      }

      // 4. Inputs
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        const input = el as HTMLInputElement;
        const label = input.labels?.[0]?.innerText || input.placeholder || input.name;
        return `Input field ${label || ''}: ${input.value || 'empty'}`;
      }

      // 5. Scheme Card elements
      const schemeCard = el.closest('[data-scheme-card]');
      if (schemeCard && el === schemeCard) {
        return schemeCard.getAttribute('aria-label') || (schemeCard as HTMLElement).innerText;
      }

      return el.innerText ? el.innerText.trim() : '';
    };

    const handleElementFocusOrHover = (target: HTMLElement) => {
      // Don't read container wrappers or full body
      if (['BODY', 'HTML', 'MAIN'].includes(target.tagName)) return;
      // Don't read the TalkBack bottom controller bar itself to prevent feedback loop
      if (target.closest('#talkback-controller-bar') || target.closest('#a11y-modal-drawer')) return;

      const text = extractReadableText(target);
      if (!text || text.length > 350) return; // Ignore massive blocks of generic text on hover

      // Update highlighted outline
      if (highlightedElementRef.current && highlightedElementRef.current !== target) {
        highlightedElementRef.current.classList.remove('talkback-speaking-outline');
      }
      target.classList.add('talkback-speaking-outline');
      highlightedElementRef.current = target;

      speakText(text, true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (hoverDebounceTimerRef.current) {
        clearTimeout(hoverDebounceTimerRef.current);
      }

      hoverDebounceTimerRef.current = setTimeout(() => {
        handleElementFocusOrHover(target);
      }, 250);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target) handleElementFocusOrHover(target);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('focusin', handleFocusIn);
      if (hoverDebounceTimerRef.current) clearTimeout(hoverDebounceTimerRef.current);
      if (highlightedElementRef.current) {
        highlightedElementRef.current.classList.remove('talkback-speaking-outline');
      }
    };
  }, [talkBackActive, speakText]);

  // Reset to default settings
  const resetDefaults = useCallback(() => {
    setHighContrast('none');
    setZoomLevel(100);
    setFontSize('normal');
    setDyslexiaFont(false);
    setReadingGuideActive(false);
    setMagnifierLensActive(false);
    setTalkBackActive(false);
    setTalkBackSpeed(1.0);
    stopSpeech();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [stopSpeech]);

  return (
    <AccessibilityContext.Provider
      value={{
        isA11yMenuOpen,
        setIsA11yMenuOpen,
        highContrast,
        setHighContrast,
        zoomLevel,
        setZoomLevel,
        magnifierLensActive,
        setMagnifierLensActive,
        fontSize,
        setFontSize,
        dyslexiaFont,
        setDyslexiaFont,
        readingGuideActive,
        setReadingGuideActive,
        talkBackActive,
        setTalkBackActive,
        talkBackSpeed,
        setTalkBackSpeed,
        isSpeaking,
        isPaused,
        currentSpokenText,
        speakText,
        pauseSpeech,
        resumeSpeech,
        stopSpeech,
        resetDefaults,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
