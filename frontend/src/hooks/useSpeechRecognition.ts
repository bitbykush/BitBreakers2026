'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function useSpeechRecognition(onTranscript?: (transcript: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  const languageRef = useRef(language);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language;
      } catch {}
    }
  }, [language]);

  const simulateVoiceInput = useCallback(() => {
    setIsRecording(true);
    setErrorMessage(null);

    const sampleTrades =
      languageRef.current === 'hi-IN'
        ? [
            'माटी के बर्तन व कुम्हारी का काम (Terracotta Potter)',
            'बढ़ई का काम एवं फर्नीचर निर्माण (Carpenter)',
            'दर्जी व सिलाई केंद्र (Tailor & Garment)',
            'चाय नाश्ता दुकान व स्ट्रीट वेंडर (Tea Stall & Street Food)',
            'डेयरी फार्मिंग व दुग्ध व्यवसाय (Dairy Farming)',
            'हथकरघा व वस्त्र बुनाई (Handloom Weaver)',
          ]
        : [
            'Terracotta Potter & Clay Handicraft Workshop',
            'Carpentry & Woodwork Furniture',
            'Tailoring & Garment Making Boutique',
            'Tea Stall & Street Vendor Shop',
            'Dairy Farming & Milk Production',
            'Handloom Weaving & Textiles',
          ];

    const picked = sampleTrades[Math.floor(Math.random() * sampleTrades.length)];
    const words = picked.split(' ');
    let currentIdx = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (currentIdx < words.length) {
        const currentChunk = words.slice(0, currentIdx + 1).join(' ');
        setTranscript(currentChunk);
        if (onTranscriptRef.current) {
          onTranscriptRef.current(currentChunk);
        }
        currentIdx++;
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRecording(false);
      }
    }, 220);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = languageRef.current;

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            fullTranscript += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const text = (fullTranscript + interimTranscript).trim();
        if (text) {
          setTranscript(text);
          if (onTranscriptRef.current) {
            onTranscriptRef.current(text);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition event error:', event.error);
        setIsRecording(false);

        if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please speak closer to the microphone.');
        } else if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access blocked. Simulating voice query...');
          simulateVoiceInput();
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
          setErrorMessage('Speech service unavailable. Simulating voice query...');
          simulateVoiceInput();
        } else if (event.error !== 'aborted') {
          simulateVoiceInput();
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Failed to initialize SpeechRecognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [simulateVoiceInput]);

  const startRecording = useCallback(() => {
    setErrorMessage(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = languageRef.current;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        console.warn('Speech start error:', err);
        if (err?.name === 'InvalidStateError') {
          try {
            recognitionRef.current.stop();
          } catch {}
          setTimeout(() => {
            try {
              recognitionRef.current.lang = languageRef.current;
              recognitionRef.current.start();
              setIsRecording(true);
            } catch {
              simulateVoiceInput();
            }
          }, 150);
        } else {
          simulateVoiceInput();
        }
      }
    } else {
      simulateVoiceInput();
    }
  }, [simulateVoiceInput]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    transcript,
    language,
    setLanguage,
    startRecording,
    stopRecording,
    toggleRecording,
    isSupported,
    errorMessage,
    simulateVoiceInput,
  };
}
