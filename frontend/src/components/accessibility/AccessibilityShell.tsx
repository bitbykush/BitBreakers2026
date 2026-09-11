'use client';

import React from 'react';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { AccessibilityMenuModal } from './AccessibilityMenuModal';
import { TalkBackSpeechBar } from './TalkBackSpeechBar';
import { MagnifierLens } from './MagnifierLens';

export const AccessibilityShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AccessibilityProvider>
      {children}
      <AccessibilityMenuModal />
      <TalkBackSpeechBar />
      <MagnifierLens />
    </AccessibilityProvider>
  );
};
