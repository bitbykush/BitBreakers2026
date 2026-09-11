import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scheme Seva Kendra (योजना सेवा केंद्र) — National Welfare & Subsidy Discovery',
  description:
    'Zero-Login, AI-Driven Welfare & Scholarship Matcher with Common Application Dossier for 63M marginalized micro-entrepreneurs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col justify-between bg-slate-100 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
