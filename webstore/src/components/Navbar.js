'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, Moon, ShoppingBag, LayoutDashboard, LogOut, User, LogIn } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const router = useRouter();
  const pathname = usePathname();

  // Load theme and session on mount
  useEffect(() => {
    // 1. Theme sync
    const savedTheme = localStorage.getItem('webstore_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 2. Fetch session
    fetchSession();
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  // React to auth updates from pages
  useEffect(() => {
    const handleAuthChange = () => fetchSession();
    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('webstore_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        window.dispatchEvent(new CustomEvent('auth-state-changed'));
        router.push('/');
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <nav className="nav-header">
      <div className="nav-content">
        <Link href="/" className="brand">
          <ShoppingBag className="brand-icon" size={24} fill="currentColor" />
          <span>Home Widget Store</span>
        </Link>

        <div className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Explore
          </Link>
          <Link href="/developer" className={`nav-link ${pathname.startsWith('/developer') ? 'active' : ''}`}>
            Developer Console
          </Link>
        </div>

        <div className="nav-links">
          <button className="nav-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>Theme</span>
          </button>

          {!loading && (
            <>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Link href={`/profile/${user.username}`} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} />
                    <span>{user.username}</span>
                  </Link>
                  <button className="nav-btn primary" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link href="/login" className="nav-btn primary">
                  <LogIn size={16} />
                  <span>Login</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
