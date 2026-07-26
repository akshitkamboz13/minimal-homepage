import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Home Widget Store - Customize Your Startpage',
  description: 'Explore, install, and share custom sandboxed widgets and apps for your Home Chrome Extension. Clean aesthetics, strict permissions, and premium developer console.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('webstore_theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', saved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="mesh-background">
          <div className="mesh-blob blob-1"></div>
          <div className="mesh-blob blob-2"></div>
          <div className="mesh-blob blob-3"></div>
        </div>
        
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            {children}
          </main>
          <footer className="footer">
            <p>&copy; {new Date().getFullYear()} Home Widget Store. Powered by Next.js & MongoDB.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
