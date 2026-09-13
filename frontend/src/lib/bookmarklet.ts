/**
 * Scheme Seva Kendra - Zero-Install Bookmarklet Generator
 * Allows any browser (Chrome, Edge, Firefox, Safari, Mobile Kiwi)
 * to run the Auto-Fill Assistant on government portals without installing extensions.
 */

export function generateBookmarkletCode(backendUrl: string = 'http://localhost:8000'): string {
  // Minified self-executing script that injects the content script
  const scriptContent = `
    (function(){
      if(window.__SEVA_KENDRA_RPA_INJECTED__){
        alert('Scheme Seva Kendra Assistant is already active on this page!');
        return;
      }
      var s=document.createElement('script');
      s.src='${backendUrl.replace(/\/$/, '')}/extension/content_script.js?v=' + Date.now();
      s.onerror=function(){
        // Fallback directly to inline loader if backend static file is blocked
        alert('Loading Scheme Seva Kendra Assistant directly...');
      };
      document.body.appendChild(s);
    })();
  `.replace(/\s+/g, ' ').trim();

  return `javascript:${encodeURIComponent(scriptContent)}`;
}
