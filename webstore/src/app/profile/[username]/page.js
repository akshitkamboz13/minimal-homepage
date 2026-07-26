'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Award, ShieldCheck, Code, Star, Download, ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const { username } = params;
  const router = useRouter();

  const [devUser, setDevUser] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  async function fetchProfile() {
    try {
      // 1. Fetch user profile and their widgets
      // We can use a query helper or custom endpoint.
      // Since it's a simple dashboard, we can retrieve them by finding approved widgets matching developer author username.
      // Let's call the api to list widgets by query 'author' or fetch user and then fetch their widgets.
      // Let's search for widgets where author username is match.
      // We'll write a clean, simple fetch logic: first get user profile details, then widgets.
      
      const searchRes = await fetch(`/api/widgets?q=${encodeURIComponent(username)}`);
      if (searchRes.ok) {
        const widgetsData = await searchRes.json();
        // Filter widgets locally to guarantee developer matches username
        const devWidgets = widgetsData.filter(w => w.author?.username?.toLowerCase() === username.toLowerCase());
        setWidgets(devWidgets);

        // Extract dev profile from first widget
        if (devWidgets.length > 0) {
          setDevUser(devWidgets[0].author);
        } else {
          // If no widgets, fallback mock profile details or try to resolve user
          setDevUser({
            username,
            bio: 'No widgets published yet. This developer profile is currently blank.',
            badges: []
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.7 }}>Loading profile...</div>;
  }

  if (!devUser) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>We couldn&apos;t load the profile page for &apos;{username}&apos;.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Explore Store</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        marginBottom: '1.5rem',
        fontWeight: '500'
      }}>
        <ArrowLeft size={16} />
        <span>Back to Explore</span>
      </Link>

      {/* Profile Card */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-color) 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.8rem',
          color: '#fff',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
        }}>
          {devUser.username.substring(0, 1).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0px' }}>{devUser.username}</h2>
            {devUser.badges?.map((badge, idx) => (
              <span key={idx} style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                color: 'var(--accent-color)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Award size={10} />
                <span>{badge}</span>
              </span>
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {devUser.bio || 'This developer hasn\'t written a bio yet.'}
          </p>
        </div>
      </div>

      {/* Developer widgets catalog */}
      <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Widgets by {devUser.username} ({widgets.length})</h3>

      {widgets.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: '0.9rem', padding: '2rem 0' }}>This developer hasn&apos;t published any widgets yet.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {widgets.map(widget => (
            <Link
              key={widget._id}
              href={`/widget/${widget._id}`}
              className="glass-card hoverable"
              style={{
                textDecoration: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '210px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)'
                  }}>
                    {widget.category}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {widget.isVerified && (
                      <ShieldCheck size={16} style={{ color: 'var(--accent-color)' }} />
                    )}
                    {widget.openSource && (
                      <Code size={16} style={{ color: '#22c55e' }} />
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>{widget.name}</h3>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.4',
                  height: '56px'
                }}>
                  {widget.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid var(--card-border)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <span>Version {widget.version}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={13} className="star-filled" fill="currentColor" />
                    <strong>{widget.averageRating}</strong> ({widget.ratingsCount})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Download size={13} />
                    <strong>{widget.downloads}</strong>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
