import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'SchoolFinance Pro | Annual Report System',
  description: 'Premium Secondary School Financial Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Disable Vercel preview toolbar */}
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined') {
            window.__VERCEL_INSIGHTS_ENABLED = false;
            var style = document.createElement('style');
            style.textContent = 'vercel-live-feedback, #__vercel-toolbar, [data-vercel-toolbar] { display: none !important; }';
            document.head.appendChild(style);
          }
        `}} />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #dde6f5',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#d1fae5' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fee2e2' } },
          }}
        />
      </body>
    </html>
  );
}
