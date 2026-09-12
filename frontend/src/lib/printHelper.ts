/**
 * printHelper.ts - Isolated & high-fidelity A4 print engine for Scheme Seva Kendra Dossiers
 */

export const printDossier = (
  elementId: string = 'print-dossier',
  documentTitle: string = 'CAF_Application_Dossier'
): void => {
  if (typeof window === 'undefined') return;

  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    window.print();
    return;
  }

  // Remove any previously leftover print frames
  const oldIframe = document.getElementById('ssk-print-iframe');
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create an invisible isolated iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'ssk-print-iframe';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  // Extract all stylesheets and style rules from current page
  const headStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((node) => node.outerHTML)
    .join('\n');

  // Specific print formatting rules for multi-page A4 Dossier
  const printCss = `
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm 12mm 12mm 12mm;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box !important;
      }

      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-font-smoothing: antialiased;
      }

      #print-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 10px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }

      table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      tr, td, th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }

      .page-break-after {
        page-break-after: always !important;
        break-after: page !important;
      }

      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .no-print {
        display: none !important;
      }

      img {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        page-break-inside: avoid !important;
      }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        ${headStyles}
        ${printCss}
      </head>
      <body>
        <div id="print-container">
          ${targetElement.innerHTML}
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Ensure all images are fully loaded before print dialog triggers
  const images = Array.from(doc.querySelectorAll('img'));
  const imagePromises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });

  Promise.all(imagePromises).then(() => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print error, falling back to window.print', e);
        window.print();
      } finally {
        // Clean up iframe after print dialog closes/finishes
        setTimeout(() => {
          iframe.remove();
        }, 3000);
      }
    }, 300);
  });
};
