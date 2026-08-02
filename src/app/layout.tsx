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
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0d1526',
              color: '#e8edf8',
              border: '1px solid #1e2d4a',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d2318' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#2a0a0a' } },
          }}
        />
      </body>
    </html>
  );
}
