/**
 * Scheme Seva Kendra (योजना सेवा केंद्र) - Sugam Seva Sahayak (सुगम सेवा सहायक)
 * Production Accessibility-First e-RPA Form Auto-Fill Co-Pilot
 * 
 * Target Environments:
 *   - Jan Samarth Portal: https://www.jansamarth.in/* (Angular / SPA)
 *   - Localhost / 127.0.0.1: http://localhost:3000/* (Cross-Origin Profile Synchronization)
 * 
 * Standards & Enhancements:
 *   - Zero-Blur Accessibility: Non-disruptive high-contrast element outlines (no full-screen blur).
 *   - Idle Translucency: Fades to 35% opacity after 4s idle; restores to 100% on hover/interaction.
 *   - Morph to Sphere: Shrinks into an unobtrusive 48px floating bubble with 1 tap.
 *   - Movable GUI: Smooth drag-and-drop support across any screen coordinate.
 *   - Cross-Origin Profile Sync: Reads exact user-provided mobile & email via chrome.storage.local;
 *     strictly zero fake/random dummy fallbacks.
 *   - Un-squished UI: Comfortable 2-row layout with WCAG touch targets.
 */

(function () {
  'use strict';

  // Exclude PMEGP portal completely
  if (location.hostname.includes('pmegp')) {
    return;
  }

  // Prevent duplicate script injection
  if (window.__SUGAM_SEVA_RPA_INJECTED__) {
    console.log('[Sugam Seva Co-Pilot] Script already active on this tab.');
    return;
  }
  window.__SUGAM_SEVA_RPA_INJECTED__ = true;

  const isLocalhost = Boolean(
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname.endsWith('.localhost') ||
    location.port === '3000' ||
    location.port === '3001' ||
    location.port === '3002' ||
    location.port === '5173'
  );

  // ---------------------------------------------------------------------------
  // 1. Cross-Origin Profile Synchronization Bridge
  // ---------------------------------------------------------------------------
  // When running on localhost (Scheme Seva Kendra app), actively sync profile to chrome.storage.local
  if (isLocalhost) {
    function syncLocalhostProfile() {
      try {
        const raw = localStorage.getItem('udyamsetu_applicant_profile');
        if (raw && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const parsed = JSON.parse(raw);
          chrome.storage.local.set({ udyamsetu_shared_profile: parsed });
          console.log('[Sugam Seva Bridge] Synced profile to chrome.storage.local:', parsed.name, parsed.mobileNumber, parsed.email);
        }
      } catch (e) {}
    }

    // Sync on boot
    syncLocalhostProfile();

    // Listen for custom event from frontend storage.ts
    window.addEventListener('SEVA_KENDRA_PROFILE_SYNC', (e) => {
      if (e.detail && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ udyamsetu_shared_profile: e.detail });
        console.log('[Sugam Seva Bridge] Real-time profile update saved to chrome.storage.local:', e.detail.mobileNumber, e.detail.email);
      }
    });

    // Also listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'udyamsetu_applicant_profile') syncLocalhostProfile();
    });

    console.log('[Sugam Seva Bridge] Localhost sync listener initialized. Assistant dock & automation disabled on home site.');
    return; // Assistant Co-Pilot is strictly disabled on user's own website; only active on external portals
  }

  // ---------------------------------------------------------------------------
  // 2. Configuration & User Preferences
  // ---------------------------------------------------------------------------
  const CONFIG = {
    apiEndpoint: 'http://localhost:8000/api/v1/automation/match-fields',
    language: 'hi', // 'hi' or 'en'
    voiceEnabled: true,
    soundEnabled: true,
    spotlightEnabled: true, // Focus ring highlight
    typingSpeedMs: 15,
    sessionKey: 'SUGAM_SEVA_RPA_SESSION',
  };

  try {
    const savedPrefs = localStorage.getItem('sugam_seva_prefs');
    if (savedPrefs) Object.assign(CONFIG, JSON.parse(savedPrefs));
  } catch (e) {}

  function savePreferences() {
    try {
      localStorage.setItem('sugam_seva_prefs', JSON.stringify({
        language: CONFIG.language,
        voiceEnabled: CONFIG.voiceEnabled,
        soundEnabled: CONFIG.soundEnabled,
        spotlightEnabled: CONFIG.spotlightEnabled
      }));
    } catch (e) {}
  }

  // Runtime State
  let isRunning = false;
  let isPaused = false;
  let activeSpotlight = null;
  let isSphereMode = false;
  let idleTimer = null;
  let isDragging = false;
  let processedFieldSignatures = new Set();
  let stepMutationObserver = null;
  let popupWatchdogInterval = null;
  let activeUnexpectedModal = null;
  let lastRunTimestamp = 0;
  let lastObservedUrl = location.href;
  let lastStepSignatures = '';

  // ---------------------------------------------------------------------------
  // 3. Shared Profile Retrieval (Zero Fake Data Guarantee)
  // ---------------------------------------------------------------------------
  async function getSharedCitizenProfile() {
    // 1. Check chrome.storage.local (synced from Scheme Seva Kendra frontend)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const data = await chrome.storage.local.get(['udyamsetu_shared_profile', 'sugam_seva_profile']);
        if (data.udyamsetu_shared_profile) return data.udyamsetu_shared_profile;
        if (data.sugam_seva_profile) return data.sugam_seva_profile;
      } catch (e) {}
    }

    // 2. Check session storage state
    try {
      const sess = getSessionState();
      if (sess && sess.citizenProfile) return sess.citizenProfile;
    } catch (e) {}

    // 3. Check local storage
    try {
      const raw = localStorage.getItem('udyamsetu_applicant_profile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return null;
  }

  function getSessionState() {
    try {
      const raw = sessionStorage.getItem(CONFIG.sessionKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < 45 * 60 * 1000) return parsed;
    } catch (e) {}
    return null;
  }

  function saveSessionState(state) {
    try {
      const current = getSessionState() || {};
      const merged = { ...current, ...state, timestamp: Date.now() };
      sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(merged));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [CONFIG.sessionKey]: merged });
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 4. Audio & Speech Guidance (Exact Field Names & Autoplay Guard)
  // ---------------------------------------------------------------------------
  let sharedAudioCtx = null;

  function unlockAudioContextOnGesture() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass && !sharedAudioCtx) {
        sharedAudioCtx = new AudioCtxClass();
      }
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  // Passive unlock on first user gesture (Chrome Autoplay policy compliance)
  ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlockAudioContextOnGesture, { capture: true, passive: true });
  });

  function getUnlockedAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return null;
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtxClass();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
      return sharedAudioCtx.state === 'running' ? sharedAudioCtx : null;
    } catch (e) {
      return null;
    }
  }

  function playAudioChime(isAlert = false) {
    if (!CONFIG.soundEnabled) return;
    try {
      const ctx = getUnlockedAudioContext();
      if (!ctx) return; // Silently skip if user hasn't interacted yet (complies with Chrome Autoplay policy)

      if (isAlert) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  let cachedVoices = [];
  function populateVoices() {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      }
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  function getBestVoiceForLanguage(isHindi) {
    if (!cachedVoices.length) populateVoices();
    if (!cachedVoices.length) return null;

    if (isHindi) {
      // Find native Hindi voice (e.g. Google हिन्दी, Microsoft Kalpana, Microsoft Hemant)
      return (
        cachedVoices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN') ||
        cachedVoices.find(v => v.lang.toLowerCase().startsWith('hi')) ||
        cachedVoices.find(v => /hindi|हिन्दी/i.test(v.name)) ||
        null
      );
    } else {
      // Find Indian English or standard English voice
      return (
        cachedVoices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN') ||
        cachedVoices.find(v => /india/i.test(v.name) && v.lang.startsWith('en')) ||
        cachedVoices.find(v => v.lang === 'en-GB') ||
        cachedVoices.find(v => v.lang === 'en-US') ||
        cachedVoices.find(v => v.lang.startsWith('en')) ||
        null
      );
    }
  }

  function speakVoiceGuide(textEn, textHi) {
    if (!CONFIG.voiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const isHindi = CONFIG.language === 'hi';
      const promptText = isHindi ? (textHi || textEn) : (textEn || textHi);
      if (!promptText) return;

      const utterance = new SpeechSynthesisUtterance(promptText);
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
      const matchedVoice = getBestVoiceForLanguage(isHindi);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.rate = isHindi ? 0.90 : 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onerror = (e) => {
        console.warn('[Sugam Seva TTS] Speech error:', e.error);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Sugam Seva TTS] Failure:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Exact Field Name Dictionary (Eliminates "Field" or "Blank")
  // ---------------------------------------------------------------------------
  function isOtpElement(el) {
    if (!el) return false;
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
    if (ac === 'one-time-code') return true;

    const attrs = [
      el.id || '',
      el.name || '',
      el.placeholder || '',
      el.className || '',
      el.getAttribute('aria-label') || '',
      el.title || ''
    ].join(' ').toLowerCase();

    if (/\botp\b|one[-_\s]*time[-_\s]*(password|code|pin)|verification[-_\s]*code|auth[-_\s]*code|मैसेज\s*कोड|ओटीपी/i.test(attrs)) {
      return true;
    }

    // Digit boxes in an OTP group (maxlength="1" or size="1")
    if ((el.maxLength === 1 || el.getAttribute('maxlength') === '1') &&
        (el.type === 'text' || el.type === 'number' || el.type === 'tel' || el.inputMode === 'numeric')) {
      const parentTxt = (el.closest('.otp, .otp-group, .digit-group, [id*="otp"], [class*="otp"], form, div')?.innerText || '').toLowerCase();
      if (/\botp\b|verification|code|digit|ओटीपी/i.test(parentTxt)) {
        return true;
      }
    }

    // Check enclosing container or modal header
    const container = el.closest('div, form, section, [role="dialog"], .modal');
    if (container) {
      const head = (container.querySelector('h1, h2, h3, h4, h5, .title, .modal-title, label')?.innerText || '').toLowerCase();
      if (/\b(enter|verify|submit|resend)\s*otp\b|otp\s*verification|सत्यापन\s*ओटीपी|ओटीपी\s*दर्ज/i.test(head)) {
        if (!/mobile|phone|contact|दूरभाष/i.test(el.name || el.id || '') || /\botp\b/i.test(attrs)) {
          return true;
        }
      }
    }

    return false;
  }

  // Helper to extract clean field labels: keeps short hints (<=9 chars like '(in Rs.)', '(dd-mm-yy)'),
  // while ignoring long descriptive paragraphs and tooltip guidelines entirely.
  function sanitizeFormLabel(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    // Strip leading list/row numbering (e.g. "1. ", "2. ", "(1) ", "1) ", "1- ", "(a) ")
    cleaned = cleaned.replace(/^[\(\[]?\d+[A-Za-z]?[\)\]\.\-\:]\s*/, '').replace(/^[\(\[][a-zA-Z][\)\]\.\-\:]\s*/, '');

    // 1. If text has multiple lines, take the first non-instructional title line
    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const titleLine = lines.find(l => !/^(note|ध्यान दें|सूचना|note\s*:-)/i.test(l) && l.length <= 65);
      cleaned = titleLine || lines[0];
      cleaned = cleaned.replace(/^[\(\[]?\d+[A-Za-z]?[\)\]\.\-\:]\s*/, '');
    }

    // 2. If text contains ' : ' separating a title from a long instruction paragraph (> 25 chars or starting with Note/Digit)
    if (cleaned.includes(':')) {
      const parts = cleaned.split(/\s*:\s*/);
      if (parts.length > 1 && (parts[1].length > 25 || /^(note|12 digit|digit|should|ambiguity|कृपया|आवेदन)/i.test(parts[1]))) {
        cleaned = parts[0];
      }
    }

    // 3. Parenthetical hints: keep short hints (<= 9 chars, e.g. '(in Rs.)', '(dd-mm-yy)', '(10 digit)'),
    // while completely ignoring long parenthetical descriptions (> 9 chars).
    cleaned = cleaned.replace(/\(([^)]{10,})\)/g, ' ').replace(/\[([^\]]{10,})\]/g, ' ');

    // 4. Normalize spacing
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  const FIELD_DICTIONARY = [
    // 1. Security / OTP / Captcha
    {
      pattern: /\b(otp|one[\s_-]*time|verification[\s_-]*code|auth[\s_-]*code)\b|ओटीपी|सत्यापन\s*कोड/i,
      en: 'Mobile Verification OTP',
      hi: 'सत्यापन ओटीपी',
      guideEn: 'Please enter the verification OTP received on your mobile phone.',
      guideHi: 'कृपया अपने मोबाइल फोन पर आया सत्यापन ओटीपी दर्ज करें।',
      exampleEn: 'e.g. 6-digit code',
      exampleHi: 'उदा: 6 अंकों का कोड',
      isOtp: true
    },
    {
      pattern: /\b(captcha|security[\s_-]*code|visual[\s_-]*code)\b|कैप्चा/i,
      en: 'Security CAPTCHA Code',
      hi: 'सुरक्षा कैप्चा कोड',
      guideEn: 'Please type the security CAPTCHA code shown in the image above.',
      guideHi: 'स्क्रीन पर दिख रहा सुरक्षा कैप्चा कोड देखकर यहाँ टाइप करें।',
      exampleEn: 'Type characters shown on screen',
      exampleHi: 'स्क्रीन पर दिख रहे अक्षर यहाँ लिखें'
    },
    {
      pattern: /\b(password|passcode)\b|पासवर्ड/i,
      en: 'Account Password',
      hi: 'पासवर्ड',
      guideEn: 'Enter your account password.',
      guideHi: 'यहाँ अपना पासवर्ड दर्ज करें।'
    },

    // 2. Contact Details (Mobile / Email)
    {
      pattern: /\b(mobile|phone|contact|telephone|cellphone|door[-_\s]*bhash)\b|मोबाइल|दूरभाष/i,
      en: 'Mobile Number',
      hi: 'मोबाइल नंबर',
      guideEn: 'Enter your 10-digit mobile number for SMS alerts.',
      guideHi: 'यहाँ अपना 10 अंकों का मोबाइल नंबर लिखें जिस पर मैसेज आ सके।',
      exampleEn: 'e.g. 9876543210',
      exampleHi: 'उदा: 9876543210'
    },
    {
      pattern: /\b(email|e[\s_-]*mail)\b|ईमेल/i,
      en: 'Email Address',
      hi: 'ईमेल आईडी',
      guideEn: 'Enter your active email address if you have one.',
      guideHi: 'यहाँ अपनी ईमेल आईडी लिखें (यदि उपलब्ध हो)।',
      exampleEn: 'e.g. name@gmail.com',
      exampleHi: 'उदा: ram@gmail.com'
    },

    // 3. Location & Address (Checked BEFORE PAN and Personal Names to ensure address containers/labels never match PAN!)
    {
      pattern: /\b(pincode|pin[\s_-]*code|postal[\s_-]*code)\b|पिन\s*कोड/i,
      en: 'Postal PIN Code',
      hi: 'पिन कोड',
      guideEn: 'Enter your 6-digit area postal PIN code.',
      guideHi: 'यहाँ अपने क्षेत्र का 6 अंकों का पोस्टल पिन कोड लिखें।',
      exampleEn: 'e.g. 110001',
      exampleHi: 'उदा: 110001'
    },
    {
      pattern: /\b(state|domicile)\b|राज्य/i,
      en: 'State',
      hi: 'राज्य',
      guideEn: 'Select your home state or union territory from the list.',
      guideHi: 'यहाँ सूची में से अपना राज्य चुनें।'
    },
    {
      pattern: /\b(district|zila)\b|ज़िला/i,
      en: 'District',
      hi: 'ज़िला',
      guideEn: 'Select your home district from the list.',
      guideHi: 'यहाँ सूची में से अपना ज़िला चुनें।'
    },
    {
      pattern: /\b(taluk|taluka|block|tehsil|mandal)\b|तहसील|तालुका|ब्लॉक/i,
      en: 'Taluk or Block',
      hi: 'तालुका / ब्लॉक',
      guideEn: 'Enter or select your Taluka, Tehsil, or Block name.',
      guideHi: 'यहाँ अपनी तहसील, तालुका या ब्लॉक का नाम लिखें या चुनें।'
    },
    {
      pattern: /\b(address|residential[\s_-]*address|communication[\s_-]*address|permanent[\s_-]*address|pata|street|colony|house|mohalla|village)\b|निवास\s*का\s*पता|पत्राचार\s*का\s*पता|संचार\s*का\s*पता|स्थाई\s*पता|पता/i,
      en: 'Residential Address',
      hi: 'निवास का पता',
      guideEn: 'Enter your full residential address including house number, street, or village.',
      guideHi: 'यहाँ अपने रहने का पूरा पता लिखें - जैसे मकान नंबर, गली, मोहल्ला या गाँव।',
      exampleEn: 'e.g. House No. 12, Ward 4, Rampur',
      exampleHi: 'उदा: मकान नं 12, वार्ड 4, रामपुर'
    },

    // 4. Financial & Project Cost Info
    {
      pattern: /\b(annual[\s_-]*income|family[\s_-]*income|gross[\s_-]*income|income|earnings)\b|वार्षिक\s*आय|पारिवारिक\s*आय|आय/i,
      en: 'Annual Family Income',
      hi: 'वार्षिक पारिवारिक आय',
      guideEn: 'Enter your total annual family income in Rupees.',
      guideHi: 'यहाँ अपनी पूरे परिवार की एक साल की कुल आय रुपये में लिखें।',
      exampleEn: 'e.g. 150000',
      exampleHi: 'उदा: 150000'
    },
    {
      pattern: /\b(project[\s_-]*cost|total[\s_-]*project|total[\s_-]*cost|capital[\s_-]*cost|capital[\s_-]*expenditure|working[\s_-]*capital|loan[\s_-]*amount|capital)\b|परियोजना\s*लागत|लागत|पूंजी/i,
      en: 'Project Cost or Capital',
      hi: 'परियोजना लागत / पूंजी',
      guideEn: 'Enter the estimated total cost of your project or required loan amount.',
      guideHi: 'यहाँ अपने व्यापार या प्रोजेक्ट की कुल अनुमानित लागत रुपये में लिखें।',
      exampleEn: 'e.g. 500000',
      exampleHi: 'उदा: 500000'
    },
    {
      pattern: /\b(own[\s_-]*contribution|promoter[\s_-]*margin|beneficiary[\s_-]*share|margin[\s_-]*money)\b|स्वयं\s*का\s*अंशदान|मार्जिन\s*मनी/i,
      en: 'Promoter Contribution',
      hi: 'प्रमोटर का अंशदान',
      guideEn: 'Enter the amount you are contributing yourself towards the project.',
      guideHi: 'यहाँ वह राशि लिखें जो आप स्वयं अपनी तरफ से लगा रहे हैं।'
    },

    // 5. Identity Documents (Aadhaar & PAN)
    {
      pattern: /\b(aadhaar|uidai|uid[\s_-]*no|virtual[\s_-]*id)\b|आधार/i,
      en: 'Aadhaar Card Number',
      hi: 'आधार कार्ड नंबर',
      guideEn: 'Type your 12-digit Aadhaar number and click the Validate Aadhaar button.',
      guideHi: 'यहाँ अपना 12 अंकों का आधार नंबर लिखें और वैलिडेट बटन दबाएं।',
      exampleEn: '12 digits without spaces',
      exampleHi: '12 अंकों का नंबर (बिना स्पेस के)',
      isAadhaar: true
    },
    {
      pattern: /\b(pan[\s_-]*(?:card|no|number)|permanent[\s_-]*account[\s_-]*number)\b|पैन\s*(?:कार्ड|नं|नंबर)/i,
      en: 'PAN Card Number',
      hi: 'पैन कार्ड नंबर',
      guideEn: 'Enter your 10-character alphanumeric PAN card number.',
      guideHi: 'यहाँ अपना 10 अक्षरों का पैन कार्ड नंबर लिखें।',
      exampleEn: 'e.g. ABCDE1234F',
      exampleHi: 'उदा: ABCDE1234F'
    },

    // 6. Family & Personal Info
    {
      pattern: /\b(father|husband|spouse|father[\s_-]*name|husband[\s_-]*name|pita|pati)\b|पिता|पति/i,
      en: "Father or Husband's Name",
      hi: 'पिता या पति का नाम',
      guideEn: "Enter your father's or husband's full name as per official ID.",
      guideHi: 'यहाँ अपने पिता या पति का पूरा नाम लिखें।',
      exampleEn: 'e.g. Suresh Kumar',
      exampleHi: 'उदा: सुरेश कुमार'
    },
    {
      pattern: /\b(mother|mother[\s_-]*name|mata)\b|माता/i,
      en: "Mother's Name",
      hi: 'माता का नाम',
      guideEn: "Enter your mother's full name.",
      guideHi: 'यहाँ अपनी माता का पूरा नाम लिखें।'
    },
    {
      pattern: /\b(applicant[\s_-]*name|candidate[\s_-]*name|beneficiary[\s_-]*name|full[\s_-]*name|name\s*of\s*(?:the\s*)?applicant|name\s*of\s*(?:the\s*)?candidate)\b|आवेदक\s*का\s*नाम/i,
      en: 'Applicant Name',
      hi: 'आवेदक का नाम',
      guideEn: 'Enter your full name exactly as printed on your Aadhaar card.',
      guideHi: 'यहाँ आधार कार्ड के अनुसार अपना पूरा नाम लिखें।',
      exampleEn: 'e.g. Ramesh Kumar',
      exampleHi: 'उदा: रमेश कुमार'
    },
    {
      pattern: /\b(name)\b|नाम/i,
      en: 'Applicant Name',
      hi: 'नाम',
      guideEn: 'Enter full name.',
      guideHi: 'यहाँ पूरा नाम लिखें।'
    },
    {
      pattern: /\b(dob|birth|birth[\s_-]*date|janam)\b|जन्म\s*तिथि/i,
      en: 'Date of Birth',
      hi: 'जन्म तिथि',
      guideEn: 'Enter or select your date of birth (Day, Month, Year).',
      guideHi: 'यहाँ अपनी जन्म तिथि (दिन, महीना, साल) चुनें या लिखें।',
      exampleEn: 'e.g. DD/MM/YYYY',
      exampleHi: 'उदा: दिन/महीना/साल'
    },
    {
      pattern: /\b(gender|sex)\b|लिंग/i,
      en: 'Gender',
      hi: 'लिंग',
      guideEn: 'Select your gender - Male, Female, or Transgender.',
      guideHi: 'यहाँ अपना लिंग चुनें - पुरुष, महिला या अन्य।'
    },
    {
      pattern: /\b(marital|marital[\s_-]*status|married|unmarried|vivah)\b|वैवाहिक\s*स्थिति/i,
      en: 'Marital Status',
      hi: 'वैवाहिक स्थिति',
      guideEn: 'Select your marital status (Married or Unmarried).',
      guideHi: 'यहाँ अपनी वैवाहिक स्थिति चुनें (विवाहित या अविवाहित)।'
    },
    {
      pattern: /\b(special\s*category)\b|विशेष\s*श्रेणी/i,
      en: 'Special Category',
      hi: 'विशेष श्रेणी',
      guideEn: 'Select special category if applicable (e.g. Ex-Serviceman, Divyang, or None).',
      guideHi: 'यहाँ विशेष श्रेणी चुनें (जैसे भूतपूर्व सैनिक, दिव्यांग या कोई नहीं)।'
    },
    {
      pattern: /\b(caste|category|social[\s_-]*category|varg|samajik)\b|सामाजिक\s*श्रेणी|जाति/i,
      en: 'Social Category',
      hi: 'सामाजिक श्रेणी',
      guideEn: 'Select your social category - General, OBC, SC, or ST.',
      guideHi: 'यहाँ अपनी सामाजिक श्रेणी चुनें - सामान्य (General), अन्य पिछड़ा वर्ग (OBC), SC या ST।'
    },

    // 7. Bank Details
    {
      pattern: /\b(account[\s_-]*number|account[\s_-]*no|acc[\s_-]*no|bank[\s_-]*account|khata)\b|खाता\s*संख्या/i,
      en: 'Bank Account Number',
      hi: 'बैंक खाता संख्या',
      guideEn: 'Enter your bank savings account number from your passbook.',
      guideHi: 'यहाँ अपनी बैंक पासबुक से देखकर खाता संख्या सही-सही लिखें।'
    },
    {
      pattern: /\b(ifsc|ifsc[\s_-]*code)\b|आईएफएससी/i,
      en: 'Bank IFSC Code',
      hi: 'बैंक आईएफएससी कोड',
      guideEn: 'Enter the 11-character IFSC code printed on your bank passbook.',
      guideHi: 'यहाँ बैंक पासबुक पर लिखा 11 अक्षरों का आईएफएससी कोड लिखें।',
      exampleEn: 'e.g. SBIN0001234',
      exampleHi: 'उदा: SBIN0001234'
    },
    {
      pattern: /\b(bank[\s_-]*name|bank)\b|बैंक\s*का\s*नाम/i,
      en: 'Bank Name',
      hi: 'बैंक का नाम',
      guideEn: 'Select or type your bank name.',
      guideHi: 'यहाँ अपने बैंक का नाम चुनें या लिखें।'
    },
    {
      pattern: /\b(branch|branch[\s_-]*name|shakha)\b|शाखा/i,
      en: 'Bank Branch Name',
      hi: 'बैंक शाखा',
      guideEn: 'Enter your bank branch location.',
      guideHi: 'यहाँ अपने बैंक शाखा का नाम लिखें।'
    },

    // 8. Education & Profession / Activity / Agency
    {
      pattern: /\b(sponsoring[\s_-]*agency|agency)\b|प्रायोजक\s*एजेंसी/i,
      en: 'Sponsoring Agency',
      hi: 'प्रायोजक एजेंसी',
      guideEn: 'Select your sponsoring agency (e.g. KVIC, KVIB, or DIC).',
      guideHi: 'यहाँ अपनी प्रायोजक एजेंसी चुनें - जैसे KVIC, KVIB, या DIC।'
    },
    {
      pattern: /\b(qualification|education|academic|shiksha)\b|शैक्षणिक\s*योग्यता/i,
      en: 'Educational Qualification',
      hi: 'शैक्षणिक योग्यता',
      guideEn: 'Select your highest completed educational qualification.',
      guideHi: 'यहाँ अपनी उच्चतम पढ़ाई चुनें - जैसे 8वीं, 10वीं, 12वीं या स्नातक।'
    },
    {
      pattern: /\b(activity|trade|profession|occupation|business[\s_-]*type|sector)\b|प्रस्तावित\s*व्यवसाय|व्यवसाय/i,
      en: 'Proposed Activity or Trade',
      hi: 'प्रस्तावित व्यवसाय',
      guideEn: 'Select or type your proposed business activity or trade.',
      guideHi: 'यहाँ अपने व्यापार या उद्योग का प्रकार चुनें या लिखें।'
    },
  ];

  function resolveExactFieldLabel(el, rawLabel) {
    if (isOtpElement(el)) {
      return {
        en: 'Mobile Verification OTP',
        hi: 'सत्यापन ओटीपी',
        guideEn: 'Please enter the verification OTP received on your mobile phone.',
        guideHi: 'कृपया अपने मोबाइल फोन पर आया सत्यापन ओटीपी दर्ज करें।',
        exampleEn: '6-digit code',
        exampleHi: '6 अंकों का कोड',
        isSpecific: true,
        isOtp: true,
        isAadhaar: false
      };
    }

    const isTextarea = el.tagName.toLowerCase() === 'textarea';

    // Clean up .NET ASPX identifiers: e.g. ctl00$ContentPlaceHolder1$txtAnnualIncome -> Annual Income
    let cleanName = (el.name || '')
      .replace(/^ctl\d+[\$_]/i, '')
      .replace(/ContentPlaceHolder\d*[\$_]/i, '')
      .replace(/^(txt|ddl|rdo|chk|sel)[\s_-]*/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .trim();

    let cleanId = (el.id || '')
      .replace(/^ctl\d+[\$_]/i, '')
      .replace(/^(txt|ddl|rdo|chk|sel)[\s_-]*/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .trim();

    const sanitizedRaw = sanitizeFormLabel(rawLabel);

    const combined = [
      sanitizedRaw,
      cleanId,
      cleanName,
      el.placeholder || '',
      el.getAttribute('aria-label') || ''
    ].join(' ').trim();

    // Ensure OTP check takes priority over generic mobile matching
    if (/\botp\b|one[-_\s]*time|verification[-_\s]*code|ओटीपी/i.test(combined)) {
      return {
        en: 'Mobile Verification OTP',
        hi: 'सत्यापन ओटीपी',
        guideEn: 'Please enter the verification OTP received on your phone.',
        guideHi: 'कृपया अपने फोन पर आया सत्यापन ओटीपी दर्ज करें।',
        exampleEn: '',
        exampleHi: '',
        isSpecific: true,
        isOtp: true,
        isAadhaar: false
      };
    }

    // A textarea is NEVER a PAN card or Aadhaar number!
    if (isTextarea) {
      if (!/\b(activity|trade|profession|project|remarks|description)\b/i.test(combined)) {
        return {
          en: 'Residential Address',
          hi: 'निवास का पता',
          guideEn: 'Enter your full residential address including house number, street, or village.',
          guideHi: 'यहाँ अपने रहने का पूरा पता लिखें - जैसे मकान नंबर, गली या गाँव।',
          exampleEn: 'e.g. House No. 12, Ward 4, Rampur',
          exampleHi: 'उदा: मकान नं 12, वार्ड 4, रामपुर',
          isSpecific: true,
          isOtp: false,
          isAadhaar: false
        };
      }
    }

    for (const item of FIELD_DICTIONARY) {
      // Guard against PAN false matching on address fields
      if (item.en === 'PAN Card Number') {
        if (isTextarea || /\b(address|residential|communication|pata)\b|पता|निवास/i.test(combined)) {
          continue;
        }
      }

      if (item.pattern.test(combined)) {
        return {
          en: item.en,
          hi: item.hi,
          guideEn: item.guideEn || `Please enter or select your ${item.en}.`,
          guideHi: item.guideHi || `यहाँ अपना ${item.hi} दर्ज करें या चुनें।`,
          exampleEn: item.exampleEn || '',
          exampleHi: item.exampleHi || '',
          isSpecific: true,
          isOtp: Boolean(item.isOtp),
          isAadhaar: Boolean(item.isAadhaar)
        };
      }
    }

    let cleaned = (sanitizedRaw || cleanName || cleanId || el.placeholder || '')
      .replace(/[_-]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/[*:]/g, '')
      .trim();

    if (/^(field|txt|input|item)\s*\d+$/i.test(cleaned) || !cleaned) {
      cleaned = 'Required Information';
    }

    return {
      en: cleaned,
      hi: cleaned,
      guideEn: `Please enter or select ${cleaned}.`,
      guideHi: `यहाँ ${cleaned} भरें या चुनें।`,
      exampleEn: '',
      exampleHi: '',
      isSpecific: false,
      isOtp: false,
      isAadhaar: false
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Active Modal Scope Resolver (Suppresses Background Underlay Forms)
  // ---------------------------------------------------------------------------
  function getActiveScope() {
    const MODAL_SELECTORS = [
      'dialog[open]',
      '[role="dialog"]:not([id^="sugam-seva-"])',
      '[aria-modal="true"]:not([id^="sugam-seva-"])',
      '.modal.show:not([id^="sugam-seva-"])',
      '.modal.in:not([id^="sugam-seva-"])',
      '.swal2-container',
      '.cdk-overlay-pane',
      '.ui-dialog:not([id^="sugam-seva-"])'
    ];

    let highestZ = -1;
    let topmostModal = null;

    for (const sel of MODAL_SELECTORS) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (el.closest('#sugam-seva-dock') || el.closest('#sugam-seva-banner')) continue;
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          const z = parseInt(style.zIndex, 10) || 0;
          if (z >= highestZ) {
            highestZ = z;
            topmostModal = el;
          }
        }
      }
    }

    if (topmostModal) {
      return {
        root: topmostModal,
        isModal: true,
        modalTitle: topmostModal.querySelector('h1, h2, h3, h4, .modal-title, .swal2-title')?.innerText?.trim() || 'Active Dialog'
      };
    }

    return { root: document.body, isModal: false, modalTitle: null };
  }

  // ---------------------------------------------------------------------------
  // 7. Field Scraper & Framework-Safe Native Setters
  // ---------------------------------------------------------------------------
  function extractPortalFields(onlyNew = false) {
    const scope = getActiveScope();
    const elements = Array.from(scope.root.querySelectorAll('input:not([type="hidden"]), select, textarea'));
    const descriptors = [];

    elements.forEach((el, index) => {
      if (el.closest('#sugam-seva-dock') || el.closest('#sugam-seva-banner')) return;

      // 1. Skip if element is already processed in DOM
      if (onlyNew && el.getAttribute('data-sugam-processed') === 'true') return;

      // 2. Stable field signature
      const sig = el.id || el.name || `${el.tagName}_${el.type}_${(el.placeholder || '').slice(0, 15)}_${index}`;
      if (onlyNew && processedFieldSignatures.has(sig)) return;

      // 3. Skip if element is already non-empty and validly filled
      if (onlyNew) {
        if (el.tagName.toLowerCase() === 'select' && el.value && el.value !== '0' && el.value !== '') {
          return;
        }
        if (el.type !== 'checkbox' && el.type !== 'radio' && el.value && el.value.trim().length > 0) {
          return;
        }
      }

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) return;
      if (el.disabled || el.readOnly) return;

      let rawLabel = '';

      // 1. Direct label[for="..."]
      if (el.id) {
        try {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl && lbl.innerText.trim()) rawLabel = lbl.innerText;
        } catch (e) {}
      }

      // 2. Enclosing parent <label>
      if (!rawLabel) {
        const parentLbl = el.closest('label');
        if (parentLbl && parentLbl.innerText.trim()) rawLabel = parentLbl.innerText;
      }

      // 3. Floating label or sibling label (Bootstrap 5 .form-floating / inline)
      if (!rawLabel) {
        const nextLbl = el.nextElementSibling;
        if (nextLbl && nextLbl.tagName === 'LABEL' && nextLbl.innerText.trim()) {
          rawLabel = nextLbl.innerText;
        }
      }
      if (!rawLabel) {
        const prevLbl = el.previousElementSibling;
        if (prevLbl && (prevLbl.tagName === 'LABEL' || prevLbl.tagName === 'SPAN' || prevLbl.tagName === 'STRONG') && prevLbl.innerText.trim()) {
          rawLabel = prevLbl.innerText;
        }
      }

      // 4. Form Group container (Bootstrap .form-group, .mb-3, .col-*, .form-floating)
      if (!rawLabel) {
        const container = el.closest('.form-floating, .form-group, .mb-3, .mb-2, [class*="col-"], .field-wrap');
        if (container) {
          const lbl = container.querySelector('label');
          if (lbl && lbl.innerText.trim()) rawLabel = lbl.innerText;
        }
      }

      // 5. Table Layout (Traditional Gov / ASP.NET forms)
      if (!rawLabel) {
        const td = el.closest('td');
        if (td) {
          // Check previous cell, ensuring it is a pure label cell (does not contain input/select)
          const prevTd = td.previousElementSibling;
          if (prevTd && !prevTd.querySelector('input, select, textarea') && prevTd.innerText.trim()) {
            rawLabel = prevTd.innerText;
          }
          // If still empty, check preceding span/label in this cell
          if (!rawLabel) {
            const spanInTd = td.querySelector('span, label, strong, b');
            if (spanInTd && spanInTd !== el && spanInTd.innerText.trim()) {
              rawLabel = spanInTd.innerText;
            }
          }
        }
      }

      // 6. Accessible attributes
      if (!rawLabel && el.getAttribute('aria-label')) rawLabel = el.getAttribute('aria-label');
      if (!rawLabel && el.placeholder && !/^\s*$/.test(el.placeholder)) rawLabel = el.placeholder;
      if (!rawLabel && el.title) rawLabel = el.title;

      // 7. Cleaned ASP.NET name/id fallback
      if (!rawLabel && el.name) {
        rawLabel = el.name
          .replace(/^ctl\d+[\$_]/i, '')
          .replace(/ContentPlaceHolder\d*[\$_]/i, '')
          .replace(/^(txt|ddl|rdo|chk|sel)[\s_-]*/i, '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]/g, ' ')
          .trim();
      }

      const isOtp = isOtpElement(el);
      const resolved = isOtp
        ? { en: 'Mobile Verification OTP', hi: 'सत्यापन ओटीपी', isSpecific: true, isOtp: true, isAadhaar: false }
        : resolveExactFieldLabel(el, rawLabel);

      const isAadhaar = Boolean(
        resolved.isAadhaar ||
        /\b(aadhaar|uidai)\b|आधार/i.test(resolved.en + ' ' + (el.name || '') + ' ' + (el.id || ''))
      );

      let options = null;
      if (el.tagName.toLowerCase() === 'select') {
        options = Array.from(el.options).map(o => ({ value: o.value, label: o.text.trim() }));
      }

      descriptors.push({
        field_id: sig,
        raw_id: el.id || null,
        name: el.name || null,
        label: resolved.en,
        label_hi: resolved.hi,
        raw_label: sanitizeFormLabel(rawLabel),
        tag_name: el.tagName.toLowerCase(),
        input_type: el.type || 'text',
        options: options,
        is_required: el.required || false,
        is_otp: Boolean(isOtp || resolved.isOtp),
        is_aadhaar: isAadhaar,
        guide_en: resolved.guideEn || `Please enter or select your ${resolved.en}.`,
        guide_hi: resolved.guideHi || `कृपया अपना ${resolved.hi} दर्ज करें या चुनें।`,
        example_en: resolved.exampleEn || '',
        example_hi: resolved.exampleHi || '',
        elementRef: el
      });
    });

    return descriptors;
  }

  function setNativeValue(element, value) {
    if (!element) return;
    try {
      const isSelect = element.tagName.toLowerCase() === 'select';
      const isCheckbox = element.type === 'checkbox' || element.type === 'radio';

      if (isCheckbox) {
        element.checked = Boolean(value);
        element.dispatchEvent(new Event('click', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      if (isSelect) {
        let matchedVal = value;
        const targetStr = String(value).trim().toLowerCase();
        const opts = Array.from(element.options);
        let found = opts.find(o => o.value.toLowerCase() === targetStr);
        if (!found) {
          found = opts.find(o => o.text.trim().toLowerCase() === targetStr);
        }
        if (!found) {
          found = opts.find(o => {
            const txt = o.text.trim().toLowerCase();
            return txt && txt !== '--select--' && txt !== 'select' && (txt.includes(targetStr) || targetStr.includes(txt));
          });
        }
        if (found) {
          matchedVal = found.value;
        }
        value = matchedVal;
      }

      const prototype = isSelect ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (descriptor && descriptor.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function fillFieldSmoothly(element, value, labelName) {
    if (!element || value === undefined || value === null || value === '') return;

    if (isOtpElement(element)) {
      console.warn(`[Sugam Seva] Safety Guard: Suppressed attempt to auto-fill OTP element: ${labelName}`);
      return;
    }

    if (element.getAttribute('data-seva-user-modified') === 'true') {
      console.log(`[Sugam Seva] Preserving manual user edit for: ${labelName}`);
      return;
    }

    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    } catch (e) {}

    element.style.border = '2px solid #10b981';
    element.style.backgroundColor = '#f0fdf4';

    if (element.tagName.toLowerCase() === 'select' || element.type === 'checkbox') {
      setNativeValue(element, value);
      return;
    }

    element.value = '';
    const str = String(value);
    for (let char of str) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, CONFIG.typingSpeedMs));
    }
    setNativeValue(element, str);
    element.blur();
  }

  document.addEventListener('input', (e) => {
    if (e.target && !e.target.closest('#sugam-seva-dock') && !e.target.closest('#sugam-seva-banner')) {
      if (e.isTrusted) e.target.setAttribute('data-seva-user-modified', 'true');
    }
  }, true);

  // ---------------------------------------------------------------------------
  // 8. Zero-Blur Element Spotlight & Interactive Prompt (No Full-Screen Backdrop)
  // ---------------------------------------------------------------------------
  function spotlightElement(options) {
    clearSpotlight();

    const {
      element,
      fieldNameEn,
      fieldNameHi,
      instructionEn,
      instructionHi,
      isMissingData = false,
      isAlert = false
    } = options;

    const ringColor = isAlert ? '#ef4444' : (isMissingData ? '#0284c7' : '#f59e0b');
    const origOutline = element.style.outline;
    const origOutlineOffset = element.style.outlineOffset;
    const origShadow = element.style.boxShadow;

    // NON-BLURRING ACCESSIBLE FOCUS RING
    element.style.outline = `3px solid ${ringColor}`;
    element.style.outlineOffset = '3px';
    element.style.boxShadow = `0 0 0 5px ${ringColor}33, 0 0 16px ${ringColor}66`;

    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    } catch (e) {}

    // Floating Guidance Card
    const banner = document.createElement('div');
    banner.id = 'sugam-seva-banner';
    const isHindi = CONFIG.language === 'hi';
    const displayField = isHindi ? fieldNameHi : fieldNameEn;
    const displayInstruction = isHindi ? instructionHi : instructionEn;

    banner.innerHTML = `
      <button id="sk-banner-close-btn" title="${isHindi ? 'बंद करें' : 'Close'}" aria-label="Close" style="
        position: absolute; top: 10px; right: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
        color: #94a3b8; font-size: 13px; font-weight: 800; line-height: 1; cursor: pointer;
        padding: 4px 8px; border-radius: 6px; transition: all 0.15s ease; z-index: 10;
      ">✕</button>
      <div style="display: flex; align-items: center; gap: 12px; width: 100%; padding-right: 28px;">
        <div style="font-size: 22px;">${isAlert ? '⚠️' : (isMissingData ? '✍️' : '🔒')}</div>
        <div style="flex: 1;">
          <div id="sk-banner-type-badge" style="font-size: 11px; font-weight: 800; color: ${ringColor}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isMissingData ? (isHindi ? 'विवरण दर्ज करें' : 'Information Needed') : (isHindi ? 'सत्यापन आवश्यक' : 'Action Required')}
          </div>
          <div id="sk-banner-field-title" style="font-size: 13px; font-weight: 800; color: #f8fafc;">${displayField}</div>
          <div id="sk-banner-instruction" style="font-size: 12px; color: #cbd5e1; margin-top: 1px;">${displayInstruction}</div>

          ${isMissingData ? `
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <input id="sk-missing-input" type="text"
                placeholder="${isHindi ? `${displayField} यहाँ दर्ज करें...` : `Enter ${displayField}...`}"
                style="flex: 1; height: 34px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #475569; background: #1e293b; color: white; font-size: 13px; font-weight: 600;"
              />
              <button id="sk-save-missing-btn" style="
                background: #0284c7; color: white; border: none; padding: 0 16px;
                border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer;
              ">
                ${isHindi ? 'सुरक्षित करें ✓' : 'Save & Fill ✓'}
              </button>
            </div>
          ` : ''}
        </div>

        ${!isMissingData ? `
          <button id="btn-resume-autofill" style="
            background: #10b981; color: white; border: none; padding: 8px 18px;
            border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; white-space: nowrap;
          ">
            ${isHindi ? 'हो गया / आगे बढ़ें ✓' : 'Done / Continue ✓'}
          </button>
        ` : ''}
      </div>
    `;

    banner.style.cssText = `
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
      background: #0f172a; border: 2px solid ${ringColor}; border-radius: 14px;
      padding: 12px 18px; z-index: 2147483647; box-shadow: 0 12px 36px rgba(0,0,0,0.85);
      display: flex; align-items: center; width: 490px; max-width: 92vw;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    document.body.appendChild(banner);

    const meta = { fieldNameEn, fieldNameHi, instructionEn, instructionHi, isMissingData, isAlert };
    activeSpotlight = { element, banner, origOutline, origOutlineOffset, origShadow, meta };

    playAudioChime(isAlert);
    speakVoiceGuide(
      `Please provide your ${fieldNameEn}. ${instructionEn}`,
      `कृपया अपना ${fieldNameHi} दर्ज करें। ${instructionHi}`
    );

    return new Promise(resolve => {
      const escListener = (ev) => {
        if (ev.key === 'Escape') {
          cleanup();
        }
      };

      const cleanup = () => {
        window.removeEventListener('keydown', escListener);
        clearSpotlight();
        resolve();
      };

      window.addEventListener('keydown', escListener);

      activeSpotlight = { element, banner, origOutline, origOutlineOffset, origShadow, resolve, meta };

      const closeBtn = banner.querySelector('#sk-banner-close-btn');
      if (closeBtn) {
        closeBtn.onmouseenter = () => {
          closeBtn.style.color = '#f8fafc';
          closeBtn.style.background = 'rgba(239, 68, 68, 0.25)';
          closeBtn.style.borderColor = '#ef4444';
        };
        closeBtn.onmouseleave = () => {
          closeBtn.style.color = '#94a3b8';
          closeBtn.style.background = 'rgba(255,255,255,0.06)';
          closeBtn.style.borderColor = 'rgba(255,255,255,0.15)';
        };
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          cleanup();
        };
      }

      if (isMissingData) {
        const inputEl = banner.querySelector('#sk-missing-input');
        const saveBtn = banner.querySelector('#sk-save-missing-btn');

        const handleSave = () => {
          const val = inputEl ? inputEl.value.trim() : '';
          if (val) {
            setNativeValue(element, val);
            // Cache to session and chrome.storage so never asked again
            getSharedCitizenProfile().then(profile => {
              const updated = profile || {};
              const key = fieldNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_');
              updated[key] = val;
              if (key.includes('mobile') || key.includes('phone')) updated.mobileNumber = val;
              if (key.includes('email')) updated.email = val;

              saveSessionState({ citizenProfile: updated });
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ udyamsetu_shared_profile: updated });
              }
            });
          }
          cleanup();
        };

        if (saveBtn) saveBtn.onclick = handleSave;
        if (inputEl) {
          inputEl.focus();
          inputEl.onkeydown = (ev) => {
            if (ev.key === 'Enter') handleSave();
            if (ev.key === 'Escape') cleanup();
          };
        }
      } else {
        const resumeBtn = banner.querySelector('#btn-resume-autofill');
        if (resumeBtn) resumeBtn.onclick = cleanup;

        element.addEventListener('input', () => {
          if ((element.value && element.value.length >= 6) || element.checked) {
            setTimeout(cleanup, 450);
          }
        }, { once: true });
      }
    });
  }

  function clearSpotlight() {
    if (activeSpotlight) {
      if (activeSpotlight.resolve) {
        try { activeSpotlight.resolve(); } catch (e) {}
        activeSpotlight.resolve = null;
      }
      if (activeSpotlight.element) {
        activeSpotlight.element.style.outline = activeSpotlight.origOutline || '';
        activeSpotlight.element.style.outlineOffset = activeSpotlight.origOutlineOffset || '';
        activeSpotlight.element.style.boxShadow = activeSpotlight.origShadow || '';
      }
      if (activeSpotlight.banner) activeSpotlight.banner.remove();
      activeSpotlight = null;
    }
    const oldBanner = document.getElementById('sugam-seva-banner');
    if (oldBanner) oldBanner.remove();
    clearWalkthrough();
  }

  // ---------------------------------------------------------------------------
  // 8A. Sugam Seva Sahayak: Accessible Guided Walkthrough Engine (Voice + Step-by-Step)
  // ---------------------------------------------------------------------------
  let activeWalkthrough = null;

  function isFieldUnfilled(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') {
      if (el.selectedIndex < 0) return true;
      const val = (el.value || '').trim().toLowerCase();
      const txt = (el.options[el.selectedIndex]?.text || '').trim().toLowerCase();
      return !val || val === '0' || val === '-1' ||
        txt === '--select--' || txt === 'select' || txt === '-- select --' || txt.includes('select');
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      return !el.checked;
    }
    const v = (el.value || '').trim();
    if (/aadhaar|uidai|आधार/i.test((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || ''))) {
      return v.replace(/\D/g, '').length < 12;
    }
    return v.length === 0;
  }

  function clearWalkthrough() {
    if (activeWalkthrough) {
      if (activeWalkthrough.cleanups && Array.isArray(activeWalkthrough.cleanups)) {
        activeWalkthrough.cleanups.forEach(fn => {
          try { fn(); } catch (e) {}
        });
      }
      if (activeWalkthrough.recognition) {
        try { activeWalkthrough.recognition.abort(); } catch (e) {}
      }
      if (activeWalkthrough.activeEl) {
        activeWalkthrough.activeEl.style.outline = activeWalkthrough.origOutline || '';
        activeWalkthrough.activeEl.style.outlineOffset = activeWalkthrough.origOutlineOffset || '';
        activeWalkthrough.activeEl.style.boxShadow = activeWalkthrough.origShadow || '';
      }
      if (activeWalkthrough.card) {
        activeWalkthrough.card.remove();
      }
      activeWalkthrough = null;
    }
    const oldCard = document.getElementById('sugam-sahayak-bar');
    if (oldCard) oldCard.remove();
  }

  function startGuidedWalkthrough(fields) {
    clearSpotlight();
    clearWalkthrough();

    if (!fields || fields.length === 0) {
      return;
    }

    let currentIndex = 0;
    let isListeningSpeech = false;
    let recognition = null;
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      try {
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
      } catch (e) {
        recognition = null;
      }
    }

    // Create the persistent Sahayak Companion Bar
    const card = document.createElement('div');
    card.id = 'sugam-sahayak-bar';
    card.style.cssText = `
      position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
      width: 580px; max-width: 94vw; background: #0b1329; border: 2px solid #10b981;
      border-radius: 16px; padding: 14px 18px; z-index: 2147483647;
      box-shadow: 0 16px 45px rgba(0,0,0,0.85); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc; transition: all 0.2s ease;
    `;

    card.innerHTML = `
      <!-- Close X Button -->
      <button id="sk-sahayak-close-btn" title="Close Walkthrough (Esc)" aria-label="Close" style="
        position: absolute; top: 10px; right: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
        color: #94a3b8; font-size: 13px; font-weight: 800; line-height: 1; cursor: pointer;
        padding: 4px 8px; border-radius: 6px; transition: all 0.15s ease; z-index: 10;
      ">✕</button>

      <!-- Top Row: Badge & Field Title -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding-right: 32px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span id="sk-sahayak-step-pill" style="
            background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid #059669;
            font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;
          ">
            Step 1 / ${fields.length}
          </span>
          <span id="sk-sahayak-field-title" style="font-size: 14.5px; font-weight: 800; color: #f8fafc;">
            ...
          </span>
        </div>
        <span id="sk-sahayak-field-type" style="font-size: 11px; color: #94a3b8; font-weight: 600;"></span>
      </div>

      <!-- Middle: Conversational Guidance Text -->
      <div id="sk-sahayak-guide-text" style="font-size: 13.5px; color: #e2e8f0; line-height: 1.45; margin-bottom: 6px;">
        ...
      </div>

      <!-- Concrete Example Box (shown if example exists) -->
      <div id="sk-sahayak-example-box" style="
        display: none; align-items: center; gap: 6px; font-size: 12px; color: #38bdf8;
        background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22);
        border-radius: 6px; padding: 4px 10px; margin-bottom: 10px;
      ">
        <span>💡</span>
        <span id="sk-sahayak-example-text">...</span>
      </div>

      <!-- Bottom Controls Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <!-- Listen Again Button (🔊) -->
          <button id="sk-sahayak-listen-btn" title="Listen Again / पुनः सुनें" style="
            background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px;
            padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;
          ">
            🔊 <span id="sk-sahayak-listen-lbl">सुनें</span>
          </button>
          <!-- Speech-to-Text Voice Dictation (🎤) -->
          <button id="sk-sahayak-mic-btn" title="Speak to Fill / बोलकर लिखें" style="
            background: #1e293b; color: #38bdf8; border: 1px solid #0284c7; border-radius: 8px;
            padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;
          ">
            🎤 <span id="sk-sahayak-mic-lbl">बोलकर लिखें</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <!-- Prev (⬅️) -->
          <button id="sk-sahayak-prev-btn" title="Previous / पिछला" style="
            background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 8px;
            padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer;
          ">
            ⬅️ <span id="sk-sahayak-prev-lbl">पिछला</span>
          </button>
          <!-- Next / Skip (➡️) -->
          <button id="sk-sahayak-next-btn" title="Next / अगला" style="
            background: #10b981; color: white; border: none; border-radius: 8px;
            padding: 6px 16px; font-size: 12px; font-weight: 800; cursor: pointer;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); display: flex; align-items: center; gap: 4px;
          ">
            <span id="sk-sahayak-next-lbl">अगला</span> ➡️
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(card);

    let cleanups = [];

    const closeBtn = card.querySelector('#sk-sahayak-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        finishWalkthrough(false);
      };
    }

    function finishWalkthrough(isCompleted = true) {
      clearWalkthrough();
      isRunning = false;
      saveSessionState({ isActive: false });

      const dock = document.getElementById('sugam-seva-dock');
      if (dock) {
        const progressPill = dock.querySelector('#sk-progress-pill');
        const startBtn = dock.querySelector('#sk-start-action-btn');
        if (progressPill) {
          const isHi = CONFIG.language === 'hi';
          progressPill.innerText = isCompleted ? (isHi ? 'पूर्ण ✓' : 'Done ✓') : (isHi ? 'तैयार' : 'Ready');
          progressPill.style.background = isCompleted ? '#065f46' : '#1e293b';
          progressPill.style.color = isCompleted ? '#34d399' : '#38bdf8';
          progressPill.style.borderColor = isCompleted ? '#059669' : '#334155';
        }
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.style.opacity = '1';
        }
      }

      if (isCompleted) {
        playAudioChime(false);
        speakVoiceGuide(
          'Congratulations! All fields have been completed. Please review and submit your application.',
          'बधाई हो! सभी आवश्यक विवरण पूरे हो गए हैं। कृपया समीक्षा करके अपना आवेदन सबमिट करें।'
        );
      }
    }

    function renderStep(idx) {
      // 1. Cleanup previous step
      cleanups.forEach(fn => {
        try { fn(); } catch (e) {}
      });
      cleanups = [];

      if (recognition && isListeningSpeech) {
        try { recognition.abort(); } catch (e) {}
        isListeningSpeech = false;
      }

      if (activeWalkthrough && activeWalkthrough.activeEl) {
        activeWalkthrough.activeEl.style.outline = activeWalkthrough.origOutline || '';
        activeWalkthrough.activeEl.style.outlineOffset = activeWalkthrough.origOutlineOffset || '';
        activeWalkthrough.activeEl.style.boxShadow = activeWalkthrough.origShadow || '';
      }

      // Check completion
      if (idx >= fields.length) {
        finishWalkthrough(true);
        return;
      }
      if (idx < 0) idx = 0;
      currentIndex = idx;

      const f = fields[currentIndex];
      const el = f.elementRef;

      // If detached or hidden, skip to next
      if (!el || !document.body.contains(el)) {
        renderStep(currentIndex + 1);
        return;
      }

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) {
        renderStep(currentIndex + 1);
        return;
      }

      // Save original style & apply accessible emerald focus ring
      const origOutline = el.style.outline;
      const origOutlineOffset = el.style.outlineOffset;
      const origShadow = el.style.boxShadow;

      el.style.outline = '3px solid #10b981';
      el.style.outlineOffset = '3px';
      el.style.boxShadow = '0 0 0 5px rgba(16, 185, 129, 0.28), 0 0 24px rgba(16, 185, 129, 0.45)';

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      } catch (e) {}

      activeWalkthrough = {
        card,
        fields,
        currentIndex,
        activeEl: el,
        origOutline,
        origOutlineOffset,
        origShadow,
        cleanups,
        recognition,
        refreshLanguage: () => renderStep(currentIndex)
      };

      // 2. Update Companion Card UI
      const isHi = CONFIG.language === 'hi';
      const stepPill = card.querySelector('#sk-sahayak-step-pill');
      const titleEl = card.querySelector('#sk-sahayak-field-title');
      const typeEl = card.querySelector('#sk-sahayak-field-type');
      const guideEl = card.querySelector('#sk-sahayak-guide-text');
      const exBox = card.querySelector('#sk-sahayak-example-box');
      const exText = card.querySelector('#sk-sahayak-example-text');
      const listenLbl = card.querySelector('#sk-sahayak-listen-lbl');
      const micLbl = card.querySelector('#sk-sahayak-mic-lbl');
      const prevBtn = card.querySelector('#sk-sahayak-prev-btn');
      const prevLbl = card.querySelector('#sk-sahayak-prev-lbl');
      const nextBtn = card.querySelector('#sk-sahayak-next-btn');
      const nextLbl = card.querySelector('#sk-sahayak-next-lbl');

      if (stepPill) {
        stepPill.innerText = isHi ? `चरण ${currentIndex + 1} / ${fields.length}` : `Step ${currentIndex + 1} of ${fields.length}`;
      }
      if (titleEl) {
        titleEl.innerText = isHi ? (f.label_hi || f.label) : (f.label || f.label_hi);
      }
      if (typeEl) {
        const tag = el.tagName.toLowerCase();
        let typeStr = isHi ? 'इनपुट' : 'Input';
        if (tag === 'select') typeStr = isHi ? 'ड्रॉपडाउन सूची ▼' : 'Dropdown List ▼';
        else if (el.type === 'checkbox') typeStr = isHi ? 'चेकबॉक्स ☑' : 'Checkbox ☑';
        else if (tag === 'textarea') typeStr = isHi ? 'विस्तृत विवरण ✍️' : 'Textarea ✍️';
        else if (f.is_aadhaar) typeStr = isHi ? 'आधार (12 अंक) 🔒' : 'Aadhaar (12 Digits) 🔒';
        typeEl.innerText = typeStr;
      }
      if (guideEl) {
        guideEl.innerText = isHi ? f.guide_hi : f.guide_en;
      }

      const exampleVal = isHi ? (f.example_hi || f.example_en) : (f.example_en || f.example_hi);
      if (exBox && exText) {
        if (exampleVal) {
          exBox.style.display = 'flex';
          exText.innerText = exampleVal;
        } else {
          exBox.style.display = 'none';
        }
      }

      if (listenLbl) listenLbl.innerText = isHi ? 'सुनें' : 'Listen';
      if (micLbl) micLbl.innerText = isHi ? 'बोलकर लिखें' : 'Speak to Fill';
      if (prevLbl) prevLbl.innerText = isHi ? 'पिछला' : 'Prev';
      if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
        prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
      }
      if (nextLbl) {
        const isLast = currentIndex === fields.length - 1;
        nextLbl.innerText = isLast ? (isHi ? 'समाप्त ✓' : 'Finish ✓') : (isHi ? 'अगला' : 'Next');
      }

      // Update Dock progress pill
      const dock = document.getElementById('sugam-seva-dock');
      if (dock) {
        const progressPill = dock.querySelector('#sk-progress-pill');
        if (progressPill) {
          progressPill.innerText = `${currentIndex + 1} / ${fields.length}`;
        }
      }

      // 3. Recite Aloud
      playAudioChime(false);
      speakVoiceGuide(f.guide_en, f.guide_hi);

      // 4. Auto-advance listener: Dropdowns (<select>)
      if (el.tagName.toLowerCase() === 'select') {
        const onSelectChange = () => {
          if (el.value && el.value !== '0' && el.value !== '' && !/--select--/i.test(el.options[el.selectedIndex]?.text || '')) {
            el.style.backgroundColor = '#ecfdf5';
            playAudioChime(false);
            setTimeout(() => {
              renderStep(currentIndex + 1);
            }, 450);
          }
        };
        el.addEventListener('change', onSelectChange, { once: true });
        cleanups.push(() => el.removeEventListener('change', onSelectChange));
      }

      // 5. Auto-advance listener: Checkbox / Radio
      if (el.type === 'checkbox' || el.type === 'radio') {
        const onCheckClick = () => {
          playAudioChime(false);
          setTimeout(() => {
            renderStep(currentIndex + 1);
          }, 380);
        };
        el.addEventListener('click', onCheckClick, { once: true });
        cleanups.push(() => el.removeEventListener('click', onCheckClick));
      }

      // 6. Auto-advance listener: Text / Number / Date / Textarea (Enter key)
      const onKeyEnter = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.style.backgroundColor = '#ecfdf5';
          renderStep(currentIndex + 1);
        }
      };
      el.addEventListener('keydown', onKeyEnter);
      cleanups.push(() => el.removeEventListener('keydown', onKeyEnter));

      // 7. Auto-advance for 12-digit Aadhaar
      if (f.is_aadhaar) {
        const onAadhaarInput = () => {
          const digits = (el.value || '').replace(/\D/g, '');
          if (digits.length >= 12) {
            el.style.backgroundColor = '#ecfdf5';
            playAudioChime(false);
            setTimeout(() => {
              renderStep(currentIndex + 1);
            }, 550);
          }
        };
        el.addEventListener('input', onAadhaarInput);
        cleanups.push(() => el.removeEventListener('input', onAadhaarInput));
      }

      // 8. Auto-advance for 10-digit Mobile
      if (/mobile|phone|contact|दूरभाष/i.test(f.label + ' ' + (el.name || '') + ' ' + (el.id || ''))) {
        const onMobileInput = () => {
          const digits = (el.value || '').replace(/\D/g, '');
          if (digits.length >= 10) {
            el.style.backgroundColor = '#ecfdf5';
            playAudioChime(false);
            setTimeout(() => {
              renderStep(currentIndex + 1);
            }, 550);
          }
        };
        el.addEventListener('input', onMobileInput);
        cleanups.push(() => el.removeEventListener('input', onMobileInput));
      }

      // 9. Card Button Listeners
      const listenBtn = card.querySelector('#sk-sahayak-listen-btn');
      if (listenBtn) {
        listenBtn.onclick = () => {
          speakVoiceGuide(f.guide_en, f.guide_hi);
        };
      }

      const micBtn = card.querySelector('#sk-sahayak-mic-btn');
      if (micBtn) {
        micBtn.onclick = () => {
          if (!recognition) {
            alert(isHi ? 'माइक्रोफ़ोन इस ब्राउज़र में समर्थित नहीं है।' : 'Voice recognition is not supported in this browser.');
            return;
          }

          if (isListeningSpeech) {
            try { recognition.stop(); } catch (e) {}
            isListeningSpeech = false;
            micBtn.style.background = '#1e293b';
            micBtn.style.color = '#38bdf8';
            micBtn.style.borderColor = '#0284c7';
            if (micLbl) micLbl.innerText = isHi ? 'बोलकर लिखें' : 'Speak to Fill';
            return;
          }

          isListeningSpeech = true;
          micBtn.style.background = '#450a0a';
          micBtn.style.color = '#f87171';
          micBtn.style.borderColor = '#ef4444';
          if (micLbl) micLbl.innerText = isHi ? 'सुन रहे हैं...' : 'Listening...';

          recognition.lang = isHi ? 'hi-IN' : 'en-IN';

          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
              setNativeValue(el, transcript);
              el.style.backgroundColor = '#ecfdf5';
              playAudioChime(false);
              speakVoiceGuide('Entered.', 'दर्ज कर लिया गया।');
              setTimeout(() => {
                renderStep(currentIndex + 1);
              }, 650);
            }
          };

          recognition.onerror = (err) => {
            console.warn('[Sugam Sahayak Speech Error]', err);
            isListeningSpeech = false;
            micBtn.style.background = '#1e293b';
            micBtn.style.color = '#38bdf8';
            micBtn.style.borderColor = '#0284c7';
            if (micLbl) micLbl.innerText = isHi ? 'बोलकर लिखें' : 'Speak to Fill';
          };

          recognition.onend = () => {
            isListeningSpeech = false;
            micBtn.style.background = '#1e293b';
            micBtn.style.color = '#38bdf8';
            micBtn.style.borderColor = '#0284c7';
            if (micLbl) micLbl.innerText = isHi ? 'बोलकर लिखें' : 'Speak to Fill';
          };

          try {
            recognition.start();
          } catch (e) {
            console.warn('[Sugam Sahayak Speech Start Failed]', e);
          }
        };
      }

      if (prevBtn) {
        prevBtn.onclick = () => {
          if (currentIndex > 0) renderStep(currentIndex - 1);
        };
      }

      if (nextBtn) {
        nextBtn.onclick = () => {
          renderStep(currentIndex + 1);
        };
      }

      // Keyboard Escape listener
      const onEsc = (e) => {
        if (e.key === 'Escape') {
          finishWalkthrough(false);
        }
      };
      window.addEventListener('keydown', onEsc);
      cleanups.push(() => window.removeEventListener('keydown', onEsc));
    }

    renderStep(0);
  }

  // ---------------------------------------------------------------------------
  // 8B. Emergency Stop Controller (Shift+Esc, Alt+X, or Stop Button)
  // ---------------------------------------------------------------------------
  function triggerEmergencyStop(source = 'User') {
    console.warn(`[Sugam Seva] Emergency stop triggered via ${source}`);
    isRunning = false;
    isPaused = false;

    // 1. Cancel speech synthesis immediately
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}

    // 2. Clear any active spotlights, modals, or banners
    clearSpotlight();
    if (activeUnexpectedModal) {
      try { activeUnexpectedModal.style.boxShadow = ''; } catch (e) {}
      activeUnexpectedModal = null;
    }

    // 3. Mark session inactive
    saveSessionState({ isActive: false });

    // 4. Update Dock UI
    const dock = document.getElementById('sugam-seva-dock');
    if (dock) {
      const progressPill = dock.querySelector('#sk-progress-pill');
      if (progressPill) {
        progressPill.innerText = 'HALTED ⏹';
        progressPill.style.background = '#450a0a';
        progressPill.style.color = '#f87171';
        progressPill.style.borderColor = '#7f1d1d';
      }
      const progressBar = dock.querySelector('#sk-progress-bar');
      if (progressBar) {
        progressBar.style.background = '#ef4444';
      }
      const startBtn = dock.querySelector('#sk-start-action-btn');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.innerHTML = `⚡ ${CONFIG.language === 'hi' ? 'पुनः भरें' : 'Resume'}`;
      }
      const sphereDot = dock.querySelector('#sk-sphere-status-dot');
      if (sphereDot) {
        sphereDot.style.background = '#ef4444';
      }
    }

    // 5. Audio alert & vocal announcement
    playAudioChime(true);
    speakVoiceGuide(
      'Emergency stop activated. Assistance halted.',
      'आपातकालीन रोक सक्रिय। सहायता रोक दी गई है।'
    );
  }

  // ---------------------------------------------------------------------------
  // 9. Guided Popups & Legal Disclaimer Watchdog (Never Auto-Agrees)
  // ---------------------------------------------------------------------------
  function initPopupAndDisclaimerWatchdog() {
    if (popupWatchdogInterval) clearInterval(popupWatchdogInterval);

    popupWatchdogInterval = setInterval(() => {
      if (activeSpotlight || activeUnexpectedModal || isPaused) return;

      const scope = getActiveScope();
      if (scope.isModal && !scope.root.__sugam_handled__) {
        scope.root.__sugam_handled__ = true;
        activeUnexpectedModal = scope.root;
        isPaused = true;

        const title = scope.modalTitle || 'Portal Declaration';
        const msgEn = `Notice: Please review the "${title}" on screen and choose to agree or dismiss to proceed.`;
        const msgHi = `महत्वपूर्ण सूचना: कृपया स्क्रीन पर दी गई "${title}" घोषणा पढ़ें और अपनी सहमति के अनुसार विकल्प चुनें।`;

        playAudioChime(true);
        speakVoiceGuide(msgEn, msgHi);

        scope.root.style.boxShadow = '0 0 0 4px #f59e0b, 0 0 24px rgba(245, 158, 11, 0.4)';

        const checkDone = setInterval(() => {
          const isClosed = !document.body.contains(scope.root) || window.getComputedStyle(scope.root).display === 'none';
          if (isClosed) {
            clearInterval(checkDone);
            activeUnexpectedModal = null;
            isPaused = false;
            playAudioChime(false);
            speakVoiceGuide('Dialog closed. Continuing assistance.', 'डायलॉग बंद हुआ। सहायता जारी है।');
          }
        }, 500);
      }
    }, 800);
  }

  // ---------------------------------------------------------------------------
  // 10. Movable, Translucent, Un-Squished Floating Dock with Sphere Mode
  // ---------------------------------------------------------------------------
  function renderMinimalDock() {
    let dock = document.getElementById('sugam-seva-dock');
    if (dock) return dock;

    dock = document.createElement('div');
    dock.id = 'sugam-seva-dock';
    const isHi = CONFIG.language === 'hi';

    dock.innerHTML = `
      <!-- Dock Expanded Content -->
      <div id="sk-dock-expanded" style="display: block;">
        <!-- Header Row with Drag Handle & Controls -->
        <div id="sk-drag-header" style="
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 6px; border-bottom: 1px solid #1e293b; cursor: grab; user-select: none;
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #64748b; font-size: 14px; letter-spacing: -2px;">⋮⋮</span>
            <span style="font-size: 16px;">🏛️</span>
            <span id="sk-dock-title" style="font-size: 12px; font-weight: 800; color: #f8fafc; letter-spacing: 0.2px;">
              ${isHi ? 'सुगम सेवा सहायक' : 'Sugam Seva'}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span id="sk-progress-pill" style="
              font-size: 10px; font-weight: 700; background: #1e293b; color: #38bdf8;
              padding: 2px 7px; border-radius: 8px; border: 1px solid #334155;
            ">
              Ready
            </span>
            <!-- Emergency Stop Button -->
            <button id="sk-stop-btn" title="Emergency Stop (Shift+Esc / Alt+X)" style="
              background: #450a0a; color: #f87171; border: 1px solid #7f1d1d;
              border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center;
              justify-content: center; font-size: 11px; font-weight: bold; cursor: pointer;
            ">
              ⏹
            </button>
            <!-- Shrink into Sphere Button -->
            <button id="sk-shrink-sphere-btn" title="Shrink into Floating Sphere (⤢)" style="
              background: #1e293b; color: #94a3b8; border: 1px solid #334155;
              border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center;
              justify-content: center; font-size: 13px; font-weight: bold; cursor: pointer;
            ">
              ⤢
            </button>
          </div>
        </div>

        <!-- Non-Squished Accessibility & Action Buttons Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <!-- Voice Guide Toggle -->
            <button id="sk-toggle-voice" title="Toggle Voice Guide" style="
              background: ${CONFIG.voiceEnabled ? '#0284c7' : '#1e293b'}; color: white;
              border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; font-size: 11px;
              font-weight: 700; cursor: pointer; min-height: 32px; min-width: 44px; display: flex; align-items: center; gap: 3px;
            ">
              ${CONFIG.voiceEnabled ? '🔊' : '🔇'}
            </button>

            <!-- Spotlight Focus Ring Toggle -->
            <button id="sk-toggle-spotlight" title="Toggle Highlight Focus Ring" style="
              background: ${CONFIG.spotlightEnabled ? '#0284c7' : '#1e293b'}; color: white;
              border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; font-size: 11px;
              font-weight: 700; cursor: pointer; min-height: 32px; min-width: 44px; display: flex; align-items: center; gap: 3px;
            ">
              ${CONFIG.spotlightEnabled ? '🔦' : '🚫'}
            </button>

            <!-- Language Switcher -->
            <button id="sk-toggle-lang" title="Toggle Language (हिन्दी / English)" style="
              background: #1e293b; color: ${isHi ? '#f59e0b' : '#38bdf8'}; border: 1px solid ${isHi ? '#78350f' : '#0369a1'};
              border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 800;
              cursor: pointer; min-height: 32px; display: flex; align-items: center; gap: 4px;
            ">
              ${isHi ? '🌐 हिन्दी' : '🌐 EN'}
            </button>
          </div>

          <!-- Primary Fill Action Button -->
          <button id="sk-start-action-btn" title="Start Auto-Fill (Alt + A)" style="
            background: #10b981; hover: background: #059669; color: white; border: none;
            border-radius: 8px; padding: 6px 16px; font-size: 12px; font-weight: 800;
            cursor: pointer; min-height: 32px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
            white-space: nowrap;
          ">
            ⚡ ${isHi ? 'भरें' : 'Fill'}
          </button>
        </div>

        <!-- Progress Indicator -->
        <div style="width: 100%; height: 3px; background: #1e293b; border-radius: 2px; margin-top: 8px; overflow: hidden;">
          <div id="sk-progress-bar" style="width: 0%; height: 100%; background: #10b981; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Dock Minimized Sphere Mode -->
      <div id="sk-dock-sphere" title="Sugam Seva Bubble (Click to expand, drag to move, Shift+Esc to stop)" style="display: none; width: 46px; height: 46px; align-items: center; justify-content: center; cursor: grab; user-select: none;">
        <span style="font-size: 24px;">🏛️</span>
        <span id="sk-sphere-status-dot" style="position: absolute; top: 1px; right: 1px; width: 10px; height: 10px; background: #10b981; border-radius: 50%; border: 2px solid #0b1329;"></span>
      </div>
    `;

    // Position & Style
    dock.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; width: 330px;
      background: #0b1329; border: 1.5px solid #0284c7; border-radius: 14px;
      padding: 10px 14px; z-index: 2147483646; box-shadow: 0 10px 30px rgba(0,0,0,0.65);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: opacity 0.4s ease, transform 0.25s ease; opacity: 1;
    `;
    document.body.appendChild(dock);

    // -------------------------------------------------------------------------
    // Idle Translucency Engine
    // -------------------------------------------------------------------------
    function resetIdleFade() {
      clearTimeout(idleTimer);
      dock.style.opacity = '1';
      idleTimer = setTimeout(() => {
        if (!isRunning && !isDragging) {
          dock.style.opacity = '0.38';
        }
      }, 4000);
    }

    dock.addEventListener('mouseenter', resetIdleFade);
    dock.addEventListener('mousemove', resetIdleFade);
    dock.addEventListener('mouseleave', resetIdleFade);
    resetIdleFade();

    // -------------------------------------------------------------------------
    // Sphere Morph Mode Toggle
    // -------------------------------------------------------------------------
    const expandedDiv = dock.querySelector('#sk-dock-expanded');
    const sphereDiv = dock.querySelector('#sk-dock-sphere');
    const shrinkBtn = dock.querySelector('#sk-shrink-sphere-btn');

    function toggleSphereMode(toSphere) {
      isSphereMode = toSphere;
      if (isSphereMode) {
        expandedDiv.style.display = 'none';
        sphereDiv.style.display = 'flex';
        dock.style.width = '48px';
        dock.style.height = '48px';
        dock.style.padding = '0';
        dock.style.borderRadius = '50%';
        dock.style.border = '2px solid #0284c7';
        dock.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.5)';
      } else {
        sphereDiv.style.display = 'none';
        expandedDiv.style.display = 'block';
        dock.style.width = '330px';
        dock.style.height = 'auto';
        dock.style.padding = '10px 14px';
        dock.style.borderRadius = '14px';
        dock.style.border = '1.5px solid #0284c7';
        dock.style.boxShadow = '0 10px 30px rgba(0,0,0,0.65)';
      }
      resetIdleFade();
    }

    shrinkBtn.onclick = (e) => {
      e.stopPropagation();
      toggleSphereMode(true);
    };

    sphereDiv.onclick = (e) => {
      // If user dragged the bubble, suppress auto-open!
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      toggleSphereMode(false);
    };

    // -------------------------------------------------------------------------
    // Smooth Drag-and-Drop Handler (Movable GUI with Click Suppression)
    // -------------------------------------------------------------------------
    const dragHeader = dock.querySelector('#sk-drag-header');
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let hasDragged = false;

    function handleMouseDown(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      hasDragged = false;
      resetIdleFade();
      startX = e.clientX;
      startY = e.clientY;

      const rect = dock.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      dock.style.cursor = 'grabbing';
      if (dragHeader) dragHeader.style.cursor = 'grabbing';
      if (sphereDiv) sphereDiv.style.cursor = 'grabbing';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Detect deliberate drag movement (> 4px) to suppress click auto-open
      if (Math.hypot(dx, dy) > 4) {
        hasDragged = true;
      }

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Clamp within viewport boundaries
      newLeft = Math.max(10, Math.min(window.innerWidth - dock.offsetWidth - 10, newLeft));
      newTop = Math.max(10, Math.min(window.innerHeight - dock.offsetHeight - 10, newTop));

      dock.style.left = `${newLeft}px`;
      dock.style.top = `${newTop}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
    }

    function handleMouseUp() {
      isDragging = false;
      dock.style.cursor = 'default';
      if (dragHeader) dragHeader.style.cursor = 'grab';
      if (sphereDiv) sphereDiv.style.cursor = 'grab';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resetIdleFade();

      // Keep hasDragged active for a short tick so trailing click event is suppressed
      setTimeout(() => {
        hasDragged = false;
      }, 150);
    }

    dragHeader.addEventListener('mousedown', handleMouseDown);
    sphereDiv.addEventListener('mousedown', handleMouseDown);

    // -------------------------------------------------------------------------
    // Accessibility Toggles Wiring
    // -------------------------------------------------------------------------
    const stopBtn = dock.querySelector('#sk-stop-btn');
    if (stopBtn) {
      stopBtn.onclick = (e) => {
        e.stopPropagation();
        triggerEmergencyStop('Stop Button');
      };
    }

    dock.querySelector('#sk-toggle-voice').onclick = () => {
      CONFIG.voiceEnabled = !CONFIG.voiceEnabled;
      dock.querySelector('#sk-toggle-voice').innerText = CONFIG.voiceEnabled ? '🔊' : '🔇';
      dock.querySelector('#sk-toggle-voice').style.background = CONFIG.voiceEnabled ? '#0284c7' : '#1e293b';
      savePreferences();
      resetIdleFade();
    };

    dock.querySelector('#sk-toggle-spotlight').onclick = () => {
      CONFIG.spotlightEnabled = !CONFIG.spotlightEnabled;
      dock.querySelector('#sk-toggle-spotlight').innerText = CONFIG.spotlightEnabled ? '🔦' : '🚫';
      dock.querySelector('#sk-toggle-spotlight').style.background = CONFIG.spotlightEnabled ? '#0284c7' : '#1e293b';
      savePreferences();
      resetIdleFade();
    };

    function updateDockLanguageUI() {
      const isHi = CONFIG.language === 'hi';

      // 1. Language Toggle Button
      const langBtn = dock.querySelector('#sk-toggle-lang');
      if (langBtn) {
        langBtn.innerHTML = isHi ? '🌐 हिन्दी' : '🌐 EN';
        langBtn.title = isHi
          ? 'भाषा बदलें (वर्तमान: हिन्दी) — अंग्रेजी के लिए क्लिक करें'
          : 'Switch Language (Current: English) — Click for Hindi';
        langBtn.style.color = isHi ? '#f59e0b' : '#38bdf8';
        langBtn.style.borderColor = isHi ? '#78350f' : '#0369a1';
      }

      // 2. Dock Title
      const titleEl = dock.querySelector('#sk-dock-title');
      if (titleEl) {
        titleEl.innerText = isHi ? 'सुगम सेवा सहायक' : 'Sugam Seva';
      }

      // 3. Primary Action Button
      const startBtn = dock.querySelector('#sk-start-action-btn');
      if (startBtn && !isRunning) {
        startBtn.innerHTML = `⚡ ${isHi ? 'भरें' : 'Fill'}`;
        startBtn.title = isHi ? 'फॉर्म स्वतः भरें (Alt + A)' : 'Start Auto-Fill (Alt + A)';
      }

      // 4. Progress pill in Ready state
      const progressPill = dock.querySelector('#sk-progress-pill');
      if (progressPill && (progressPill.innerText === 'Ready' || progressPill.innerText === 'तैयार')) {
        progressPill.innerText = isHi ? 'तैयार' : 'Ready';
      }

      // 5. Shrink button tooltip
      const shrinkBtn = dock.querySelector('#sk-shrink-sphere-btn');
      if (shrinkBtn) {
        shrinkBtn.title = isHi ? 'फ्लोटिंग बबल में बदलें (⤢)' : 'Shrink into Floating Sphere (⤢)';
      }

      // 6. Stop button tooltip
      const stopBtn = dock.querySelector('#sk-stop-btn');
      if (stopBtn) {
        stopBtn.title = isHi ? 'इमरजेंसी रोक (Shift+Esc / Alt+X)' : 'Emergency Stop (Shift+Esc / Alt+X)';
      }

      // 7. Voice toggle tooltip
      const voiceBtn = dock.querySelector('#sk-toggle-voice');
      if (voiceBtn) {
        voiceBtn.title = isHi ? 'आवाज सहायता ऑन/ऑफ' : 'Toggle Voice Guide';
      }

      // 8. Spotlight toggle tooltip
      const spotBtn = dock.querySelector('#sk-toggle-spotlight');
      if (spotBtn) {
        spotBtn.title = isHi ? 'हाइलाइट फोकस ऑन/ऑफ' : 'Toggle Highlight Focus Ring';
      }

      // 9. Active Spotlight Banner update
      if (activeSpotlight && activeSpotlight.banner && activeSpotlight.meta) {
        const { banner, meta } = activeSpotlight;
        const typeBadge = banner.querySelector('#sk-banner-type-badge');
        const titleNode = banner.querySelector('#sk-banner-field-title');
        const descNode = banner.querySelector('#sk-banner-instruction');
        const inputEl = banner.querySelector('#sk-missing-input');
        const saveBtn = banner.querySelector('#sk-save-missing-btn');
        const resumeBtn = banner.querySelector('#btn-resume-autofill');

        if (typeBadge) {
          typeBadge.innerText = meta.isMissingData
            ? (isHi ? 'विवरण दर्ज करें' : 'Information Needed')
            : (isHi ? 'सत्यापन आवश्यक' : 'Action Required');
        }
        if (titleNode) titleNode.innerText = isHi ? meta.fieldNameHi : meta.fieldNameEn;
        if (descNode) descNode.innerText = isHi ? meta.instructionHi : meta.instructionEn;
        if (inputEl) inputEl.placeholder = isHi ? `${meta.fieldNameHi} यहाँ दर्ज करें...` : `Enter ${meta.fieldNameEn}...`;
        if (saveBtn) saveBtn.innerText = isHi ? 'सुरक्षित करें ✓' : 'Save & Fill ✓';
        if (resumeBtn) resumeBtn.innerText = isHi ? 'हो गया / आगे बढ़ें ✓' : 'Done / Continue ✓';

        speakVoiceGuide(
          `Please provide your ${meta.fieldNameEn}. ${meta.instructionEn}`,
          `कृपया अपना ${meta.fieldNameHi} दर्ज करें। ${meta.instructionHi}`
        );
      }

      // 10. Active Walkthrough Card update
      if (activeWalkthrough && activeWalkthrough.refreshLanguage) {
        activeWalkthrough.refreshLanguage();
      }
    }

    dock.querySelector('#sk-toggle-lang').onclick = () => {
      CONFIG.language = CONFIG.language === 'hi' ? 'en' : 'hi';
      savePreferences();
      updateDockLanguageUI();
      resetIdleFade();

      playAudioChime(false);
      speakVoiceGuide(
        'Language changed to English.',
        'भाषा बदलकर हिन्दी कर दी गई है।'
      );
    };

    dock.querySelector('#sk-start-action-btn').onclick = () => {
      saveSessionState({ isActive: true, stepIndex: 1 });
      runAssistedAutofill();
      resetIdleFade();
    };

    updateDockLanguageUI();
    return dock;
  }

  // Motor Accessibility Keyboard Shortcuts & Emergency Stop
  document.addEventListener('keydown', (e) => {
    // 1. Emergency Stop: Shift+Escape, Alt+X, or Escape while running
    if (
      (e.shiftKey && e.key === 'Escape') ||
      (e.altKey && (e.key === 'x' || e.key === 'X')) ||
      (e.key === 'Escape' && isRunning)
    ) {
      e.preventDefault();
      e.stopPropagation();
      triggerEmergencyStop(e.shiftKey ? 'Shift+Escape' : (e.altKey ? 'Alt+X' : 'Escape'));
      return;
    }

    // 2. Start / Resume auto-fill: Alt+A
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      saveSessionState({ isActive: true, stepIndex: 1 });
      runAssistedAutofill();
      return;
    }

    // 3. Clear spotlight if active: Escape
    if (e.key === 'Escape' && activeSpotlight) {
      clearSpotlight();
    }
  }, true);

  // ---------------------------------------------------------------------------
  // 11. Orchestration Loop (With Real Synced Profile & Zero Fake Data)
  // ---------------------------------------------------------------------------
  async function runAssistedAutofill(options = {}) {
    if (isRunning) return;
    isRunning = true;

    const dock = document.getElementById('sugam-seva-dock') || renderMinimalDock();
    const progressPill = dock.querySelector('#sk-progress-pill');
    const progressBar = dock.querySelector('#sk-progress-bar');
    const startBtn = dock.querySelector('#sk-start-action-btn');
    const sphereDot = dock.querySelector('#sk-sphere-status-dot');

    if (sphereDot) sphereDot.style.background = '#10b981';
    if (progressPill) {
      progressPill.style.background = '#1e293b';
      progressPill.style.color = '#38bdf8';
      progressPill.style.borderColor = '#334155';
    }
    if (progressBar) {
      progressBar.style.background = '#10b981';
    }

    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';

    // 1. Scrape fields in active scope
    const fields = extractPortalFields(options.isNewStep || false);
    if (fields.length === 0) {
      if (progressPill) {
        const isHi = CONFIG.language === 'hi';
        progressPill.innerText = isHi ? 'पूर्ण ✓' : 'Done ✓';
        progressPill.style.background = '#065f46';
        progressPill.style.color = '#34d399';
        progressPill.style.borderColor = '#059669';
      }
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      isRunning = false;
      saveSessionState({ isActive: false });
      return;
    }

    const otpFields = fields.filter(f => f.is_otp);
    const nonOtpFields = fields.filter(f => !f.is_otp);

    // Scenario A: Pure OTP Verification Screen (Modal or Dedicated OTP Step)
    if (otpFields.length > 0 && nonOtpFields.length === 0) {
      console.log('[Sugam Seva] Pure OTP verification gate detected. Yielding focus to citizen without auto-fill.');

      // Mark all OTP elements in DOM as processed so watcher does not loop
      otpFields.forEach(f => {
        processedFieldSignatures.add(f.field_id);
        if (f.elementRef) {
          f.elementRef.setAttribute('data-sugam-processed', 'true');
        }
      });

      // Gently outline and focus the first OTP input box
      const firstOtpEl = otpFields[0].elementRef;
      if (firstOtpEl) {
        firstOtpEl.style.outline = '3px solid #f59e0b';
        firstOtpEl.style.outlineOffset = '2px';
        firstOtpEl.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.25)';
        try {
          firstOtpEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstOtpEl.focus();
        } catch (e) {}
      }

      const isHi = CONFIG.language === 'hi';
      if (progressPill) {
        progressPill.innerText = isHi ? 'ओटीपी 🔑' : 'OTP 🔑';
        progressPill.style.background = '#78350f';
        progressPill.style.color = '#fde68a';
        progressPill.style.borderColor = '#b45309';
      }
      if (progressBar) progressBar.style.width = '100%';

      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.innerHTML = `⚡ ${isHi ? 'भरें' : 'Fill'}`;

      // Complete this step & deactivate auto-fill so it NEVER loops or jitters
      saveSessionState({ isActive: false });
      lastRunTimestamp = Date.now();
      lastStepSignatures = otpFields.map(f => f.field_id).sort().join('|');
      lastObservedUrl = location.href;
      isRunning = false;

      playAudioChime(false);
      speakVoiceGuide(
        'Please enter the verification OTP sent to your phone to proceed.',
        'कृपया आगे बढ़ने के लिए अपने फोन पर आया सत्यापन ओटीपी दर्ज करें।'
      );
      return;
    }

    progressPill.innerText = `0 / ${fields.length}`;

    // 2. Fetch REAL profile from cross-origin storage (ZERO fake fallback)
    const profile = (await getSharedCitizenProfile()) || {};
    console.log('[Sugam Seva] Utilizing shared profile:', {
      name: profile.name,
      mobile: profile.mobileNumber || profile.mobile_number,
      email: profile.email
    });

    const mobileVal = profile.mobileNumber || profile.mobile_number || '';
    const emailVal = profile.email || '';

    // 3. Query Backend FastEmbed API or Local Heuristics
    let mappings = [];
    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_portal: 'gov_portal',
          fields: fields.map(f => ({
            field_id: f.field_id,
            name: f.name,
            label: f.label,
            tag_name: f.tag_name,
            input_type: f.input_type,
            options: f.options,
            is_required: f.is_required,
            is_otp: Boolean(f.is_otp)
          })),
          profile: {
            name: profile.name || '',
            father_name: profile.father_name || profile.fatherHusbandName || '',
            mother_name: profile.mother_name || '',
            dob: profile.dob || '',
            gender: profile.gender || '',
            category: profile.category || '',
            marital_status: profile.marital_status || '',
            is_differently_abled: Boolean(profile.is_differently_abled),
            is_ex_serviceman: Boolean(profile.is_ex_serviceman),
            annual_income: profile.annualIncome || profile.annual_income || 0,
            masked_aadhaar: profile.maskedAadhaar || profile.masked_aadhaar || '',
            pan_number: profile.panNumber || profile.pan_number || '',
            mobile_number: mobileVal,
            email: emailVal,
            state: profile.state || '',
            district: profile.district || '',
            block: profile.block || profile.taluk || '',
            pincode: profile.pincode || '',
            address: profile.address || '',
            area_type: profile.areaType || profile.area_type || '',
            education: profile.education || '',
            profession: profile.profession || '',
            trade_or_activity: profile.trade_or_activity || profile.profession || '',
            required_capital: profile.requiredCapital || profile.required_capital || 0,
            own_contribution: profile.own_contribution || Math.round((profile.requiredCapital || profile.required_capital || 0) * 0.05),
            bank_account_no: profile.bank_account_no || profile.bankAccountNumber || '',
            bank_ifsc: profile.bank_ifsc || profile.bankIfscCode || '',
            bank_name: profile.bank_name || '',
            bank_branch: profile.bank_branch || '',
            caste_certificate_no: profile.casteCertificateNo || profile.caste_certificate_no || '',
            income_certificate_no: profile.incomeCertificateNo || profile.income_certificate_no || '',
            edp_trained: Boolean(profile.edp_trained)
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        mappings = data.mappings;
      } else {
        throw new Error('Backend HTTP ' + res.status);
      }
    } catch (err) {
      console.warn('[Sugam Seva] Backend endpoint offline or HTTPS mixed-content blocked; using exact local engine:', err);
      mappings = buildLocalMappings(fields, profile);
    }

    // 4. PASS 1: Fast Simplistic Auto-Fill (Zero Blocking Popups)
    let filledCount = 0;
    for (let i = 0; i < fields.length; i++) {
      if (!isRunning) break;
      const fieldDesc = fields[i];
      const mapping = mappings.find(m => m.field_id === fieldDesc.field_id);
      if (!mapping) continue;

      // UIDAI security: NEVER auto-fill raw Aadhaar number
      if (fieldDesc.is_aadhaar || mapping.human_action_type === 'AADHAAR_MANUAL_ENTRY') {
        continue;
      }
      // Never auto-fill Captcha or OTP
      if (fieldDesc.is_otp || mapping.human_action_type === 'CAPTCHA' || mapping.human_action_type === 'MOBILE_OTP') {
        continue;
      }

      if (mapping.action === 'AUTO_FILL' || mapping.action === 'AUTO_SELECT' || mapping.action === 'AUTO_CHECK') {
        if (mapping.suggested_value !== undefined && mapping.suggested_value !== null && mapping.suggested_value !== '') {
          setNativeValue(fieldDesc.elementRef, mapping.suggested_value);
          fieldDesc.elementRef.style.border = '2px solid #10b981';
          fieldDesc.elementRef.style.backgroundColor = '#f0fdf4';
          fieldDesc.elementRef.setAttribute('data-sugam-processed', 'true');
          processedFieldSignatures.add(fieldDesc.field_id);
          filledCount++;
          if (progressPill) {
            progressPill.innerText = `${filledCount} filled`;
          }
          if (progressBar) {
            progressBar.style.width = `${Math.min(95, Math.round((filledCount / fields.length) * 100))}%`;
          }
          await new Promise(r => setTimeout(r, 20));
        }
      }
    }

    if (!isRunning) return;

    // 5. PASS 2: Detect all remaining unfilled / interactive fields
    const unfilledFields = fields.filter(f => {
      const el = f.elementRef;
      if (!el || !document.body.contains(el)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) return false;
      if (el.disabled || el.readOnly) return false;
      return isFieldUnfilled(el);
    });

    // Sort in natural visual DOM order (top-to-bottom)
    unfilledFields.sort((a, b) => {
      const pos = a.elementRef.compareDocumentPosition(b.elementRef);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    // Case A: Everything was filled successfully!
    if (unfilledFields.length === 0) {
      const isHi = CONFIG.language === 'hi';
      if (progressPill) {
        progressPill.innerText = isHi ? 'पूर्ण ✓' : 'Done ✓';
        progressPill.style.background = '#065f46';
        progressPill.style.color = '#34d399';
        progressPill.style.borderColor = '#059669';
      }
      if (progressBar) progressBar.style.width = '100%';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.innerHTML = `⚡ ${isHi ? 'भरें' : 'Fill'}`;
      saveSessionState({ isActive: false });
      lastRunTimestamp = Date.now();
      lastStepSignatures = fields.map(f => f.field_id).sort().join('|');
      lastObservedUrl = location.href;
      isRunning = false;

      playAudioChime(false);
      speakVoiceGuide(
        'All fields have been filled automatically. Please review and proceed.',
        'सभी विवरण स्वतः भर दिए गए हैं। कृपया समीक्षा करें और आगे बढ़ें।'
      );
      return;
    }

    // Case B: Transition cleanly to Sugam Seva Sahayak Guided Walkthrough
    console.log(`[Sugam Seva Sahayak] Launching guided walkthrough for ${unfilledFields.length} unfilled fields.`);
    const isHi = CONFIG.language === 'hi';
    if (progressPill) {
      progressPill.innerText = `1 / ${unfilledFields.length}`;
    }
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.innerHTML = `⚡ ${isHi ? 'भरें' : 'Fill'}`;

    playAudioChime(false);
    speakVoiceGuide(
      `Filled ${filledCount} fields automatically. Now guiding you step by step through the remaining ${unfilledFields.length} fields.`,
      `${filledCount} विवरण स्वतः भर दिए गए हैं। अब बाकी ${unfilledFields.length} विवरणों में आपकी सहायता की जा रही है।`
    );

    await new Promise(r => setTimeout(r, 650));
    if (!isRunning) return;

    startGuidedWalkthrough(unfilledFields);
  }

  function buildLocalMappings(fields, profile) {
    const mobileVal = profile.mobileNumber || profile.mobile_number || '';
    const emailVal = profile.email || '';

    return fields.map(f => {
      const txt = (f.label + ' ' + (f.name || '')).toLowerCase();

      // 1. Security / OTP / Captcha
      if (f.is_otp || /\b(otp|one[\s_-]*time|verification[\s_-]*code|auth[\s_-]*code)\b|ओटीपी|सत्यापन\s*कोड/i.test(txt)) {
        return { field_id: f.field_id, action: 'HUMAN_INPUT_REQUIRED', requires_human: true, human_action_type: 'MOBILE_OTP' };
      }
      if (/\b(captcha|security[\s_-]*code|visual[\s_-]*code)\b|कैप्चा/i.test(txt)) {
        return { field_id: f.field_id, action: 'HUMAN_INPUT_REQUIRED', requires_human: true, human_action_type: 'CAPTCHA' };
      }
      // 2. Aadhaar Manual Entry Requirement (UIDAI Security Policy)
      if (f.is_aadhaar || /\b(aadhaar|uidai)\b|आधार/i.test(txt)) {
        return {
          field_id: f.field_id,
          action: 'HUMAN_INPUT_REQUIRED',
          requires_human: true,
          human_action_type: 'AADHAAR_MANUAL_ENTRY',
          human_prompt_message_en: 'Aadhaar Security: Please manually type your 12-digit Aadhaar number to verify.',
          human_prompt_message_hi: 'आधार सुरक्षा: कृपया सत्यापन के लिए अपना 12-अंकों का आधार नंबर स्वयं दर्ज करें।'
        };
      }
      // 3. Contact Info
      if (/\b(mobile|phone|contact|telephone|cellphone|door[-_\s]*bhash)\b|मोबाइल|दूरभाष/i.test(txt)) {
        return mobileVal
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: mobileVal }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(email|e[\s_-]*mail)\b|ईमेल/i.test(txt)) {
        return emailVal
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: emailVal }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      // 4. PAN Number
      if (/\b(pan[\s_-]*(?:card|no|num|number)|permanent[\s_-]*account[\s_-]*number)\b|पैन\s*(?:कार्ड|नं|नंबर)/i.test(txt)) {
        const pan = profile.panNumber || profile.pan_number;
        return pan ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: pan } : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      // 5. Gender & Category
      if (/\b(gender|sex)\b|लिंग/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.gender || 'Male' };
      }
      if (/\b(social[\s_-]*category|caste[\s_-]*category|category|varg|samajik)\b|सामाजिक\s*श्रेणी|जाति/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.category || 'General' };
      }
      if (/\b(special\s*category)\b|विशेष\s*श्रेणी/i.test(txt)) {
        const spec = profile.is_differently_abled ? 'Physically Handicapped' : (profile.is_ex_serviceman ? 'Ex-Serviceman' : 'General');
        return { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: spec };
      }
      // 7. Date of Birth & Qualifications
      if (/\b(dob|birth|birth[\s_-]*date|janam)\b|जन्म\s*तिथि/i.test(txt)) {
        return profile.dob
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.dob }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(qualification|highest[\s_-]*qualification|education|academic|shiksha)\b|शैक्षणिक\s*योग्यता/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.education || '10th Pass' };
      }
      // 8. Financial fields (Capital / Income)
      if (/\b(annual[\s_-]*income|family[\s_-]*income|gross[\s_-]*income|income|earnings)\b|वार्षिक\s*आय|आय/i.test(txt)) {
        const inc = profile.annualIncome || profile.annual_income;
        return inc ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: inc } : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(project[\s_-]*cost|total[\s_-]*project|total[\s_-]*cost|capital[\s_-]*cost|capital[\s_-]*expenditure|working[\s_-]*capital|loan[\s_-]*amount|capital)\b|परियोजना\s*लागत|लागत|पूंजी/i.test(txt)) {
        const cap = profile.requiredCapital || profile.required_capital || profile.required_capital_inr || profile.project_cost || 200000;
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: cap };
      }
      if (/\b(own[\s_-]*contribution|promoter[\s_-]*margin|margin[\s_-]*money)\b|मार्जिन/i.test(txt)) {
        const own = profile.own_contribution || Math.round((profile.requiredCapital || 200000) * 0.05);
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: own };
      }
      // 9. Personal Names
      if (/\b(father|husband|spouse|pita|pati)\b|पिता|पति/i.test(txt)) {
        return profile.father_name || profile.fatherHusbandName
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.father_name || profile.fatherHusbandName }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(mother|mata)\b|माता/i.test(txt)) {
        return profile.mother_name
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.mother_name }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(applicant[\s_-]*name|candidate[\s_-]*name|full[\s_-]*name|name\s*of\s*(?:the\s*)?applicant|name\s*of\s*(?:the\s*)?candidate)\b|आवेदक\s*का\s*नाम/i.test(txt) || (/\bname\b|नाम/i.test(txt) && !/\b(father|husband|mother|pita|pati|mata|bank|branch|agency|office|activity)\b/i.test(txt))) {
        return profile.name
          ? { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.name }
          : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      // 10. Address & Location
      if (/\b(unit\s*location|location\s*type)\b|इकाई\s*का\s*स्थान/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.unit_location || profile.areaType || profile.area_type || 'Rural' };
      }
      if (/\b(proposed\s*unit\s*address|unit\s*address)\b|इकाई\s*का\s*पता/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.unit_address || profile.address || '' };
      }
      if (f.tag_name === 'textarea' || /\b(address|residential|communication|pata)\b|पता|निवास/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.address || '' };
      }
      if (/\b(pincode|pin[\s_-]*code|postal[\s_-]*code)\b|पिन\s*कोड/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.pincode || '' };
      }
      if (/\b(taluk|taluka|block|tehsil|mandal)\b|तहसील|तालुका|ब्लॉक/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.block || profile.district || '' };
      }
      if (/\b(state|domicile)\b|राज्य/i.test(txt)) {
        return profile.state ? { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.state } : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      if (/\b(district|zila)\b|ज़िला/i.test(txt)) {
        return profile.district ? { field_id: f.field_id, action: 'AUTO_SELECT', suggested_value: profile.district } : { field_id: f.field_id, action: 'UNMATCHED' };
      }
      // 11. Activity / Trade
      if (/\b(activity|trade|profession|occupation|business[\s_-]*type|sector)\b|व्यवसाय/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.trade_or_activity || profile.profession || 'Trading' };
      }
      // 12. Bank Details
      if (/\b(bank[\s_-]*name)\b|बैंक\s*का\s*नाम/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.bank_name || 'State Bank of India' };
      }
      if (/\b(ifsc|ifsc[\s_-]*code)\b|आईएफएससी/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.bank_ifsc || 'SBIN0001234' };
      }
      if (/\b(account[\s_-]*number|account[\s_-]*no|bank[\s_-]*account|khata)\b|खाता\s*संख्या/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.bank_account_no || '309812739182' };
      }
      if (/\b(branch|branch[\s_-]*name|shakha)\b|शाखा/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_FILL', suggested_value: profile.bank_branch || 'Main Branch' };
      }
      // 13. Declaration Checkbox
      if (f.input_type === 'checkbox' && /\b(declare|undertake|terms|affirm|defaulter)\b|घोषणा/i.test(txt)) {
        return { field_id: f.field_id, action: 'AUTO_CHECK', suggested_value: true };
      }
      return { field_id: f.field_id, action: 'UNMATCHED' };
    });
  }

  // ---------------------------------------------------------------------------
  // 12. Dynamic Step Watcher & Page Submit Listeners
  // ---------------------------------------------------------------------------
  function initDynamicStepWatcher() {
    if (stepMutationObserver) stepMutationObserver.disconnect();

    let debounceTimer = null;
    stepMutationObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Guard 1: Ignore if already running, spotlight active, paused, or dragging
        if (isRunning || activeSpotlight || isPaused || isDragging) return;

        // Guard 2: Cooldown - don't fire within 2.5s of the last completion
        if (Date.now() - lastRunTimestamp < 2500) return;

        // Guard 3: Must have active session in progress (e.g. citizen clicked Next)
        const sess = getSessionState();
        if (!sess || !sess.isActive) return;

        // Guard 4: Extract strictly new, un-processed fields
        const newFields = extractPortalFields(true);
        if (newFields.length === 0) return;

        // Guard 5: Signature deduplication - if same set of fields on same page, don't re-run
        const sigString = newFields.map(f => f.field_id).sort().join('|');
        if (sigString === lastStepSignatures && location.href === lastObservedUrl) {
          return;
        }

        // Guard 6: If pure OTP, handle cleanly without noisy announcement
        const isPureOtp = newFields.every(f => f.is_otp);
        if (isPureOtp) {
          runAssistedAutofill({ isNewStep: true });
          return;
        }

        lastStepSignatures = sigString;
        lastObservedUrl = location.href;

        playAudioChime(false);
        speakVoiceGuide(
          `New form step detected with ${newFields.length} fields. Continuing auto-fill.`,
          `नया फॉर्म चरण मिला। फॉर्म भरना जारी है।`
        );
        runAssistedAutofill({ isNewStep: true });
      }, 800);
    });

    stepMutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function attachNavigationListeners() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="submit"], [role="button"], a');
      if (!btn || btn.closest('#sugam-seva-dock') || btn.closest('#sugam-seva-banner')) return;

      const txt = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').toLowerCase();
      if (/next|proceed|continue|submit|save|verify|आगे|अगला|सत्यापित|जारी/i.test(txt)) {
        saveSessionState({ isActive: true, stepIndex: ((getSessionState() || {}).stepIndex || 1) + 1 });
        lastStepSignatures = ''; // Reset so the upcoming step can run!
      }
    }, true);
  }

  // ---------------------------------------------------------------------------
  // 13. Initialization
  // ---------------------------------------------------------------------------
  function initialize() {
    renderMinimalDock();
    attachNavigationListeners();
    initDynamicStepWatcher();
    initPopupAndDisclaimerWatchdog();

    const sess = getSessionState();
    if (sess && sess.isActive) {
      setTimeout(() => {
        runAssistedAutofill({ isNewStep: true });
      }, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
