'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star, Download, ShieldCheck, Code, Award } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Productivity',
  'Utilities',
  'Weather',
  'Developer Tools',
  'Fun',
  'Games',
  'Finance',
  'Education',
  'Media',
  'AI',
  'Customization'
];

export default function ExplorePage() {
  const [widgets, setWidgets] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('downloads');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState('');

  useEffect(() => {
    fetchWidgets();
  }, [category, sortBy]);

  async function fetchWidgets() {
    setLoading(true);
    try {
      const url = `/api/widgets?category=${category}&sortBy=${sortBy}&q=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWidgets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchWidgets();
  }

  async function triggerSeeder() {
    setSeeding(true);
    setSeedSuccess('');
    try {
      const res = await fetch('/api/widgets/seed');
      if (res.ok) {
        const data = await res.json();
        setSeedSuccess('Successfully seeded database with 4 beautiful widgets!');
        fetchWidgets();
      } else {
        setSeedSuccess('Failed to seed database.');
      }
    } catch (e) {
      setSeedSuccess('Error communicating with seeder API.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderRadius: '24px',
        border: '1px solid var(--card-border)',
        marginBottom: '2rem',
        backdropFilter: 'blur(8px)'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.75rem', lineHeight: '1.2' }}>
          Discover the Best Widgets for <span style={{ color: 'var(--accent-color)' }}>Home</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem auto', fontSize: '1.05rem' }}>
          Extend your startpage with customizable, safe, and beautiful widgets. Choose from timers, canvas wallpapers, analytics, and more.
        </p>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} style={{
          display: 'flex',
          maxWidth: '540px',
          margin: '0 auto',
          position: 'relative'
        }}>
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search widgets, descriptions, keywords..."
            style={{
              paddingLeft: '3rem',
              paddingRight: '100px',
              borderRadius: '28px',
              height: '52px',
              fontSize: '1rem'
            }}
          />
          <Search style={{
            position: 'absolute',
            left: '1.2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)'
          }} size={20} />
          
          <button type="submit" className="btn btn-primary" style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            borderRadius: '22px',
            padding: '8px 18px',
            height: '40px'
          }}>
            Search
          </button>
        </form>
      </section>

      {/* Category Pills Navigation */}
      <section style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '2rem',
        whiteSpace: 'nowrap',
        scrollSnapType: 'x mandatory'
      }} className="category-scroll">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              background: category === cat ? 'var(--accent-color)' : 'var(--card-bg)',
              color: category === cat ? '#fff' : 'var(--text-primary)',
              border: '1px solid',
              borderColor: category === cat ? 'var(--accent-color)' : 'var(--card-border)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              scrollSnapAlign: 'start'
            }}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Controls & Seed Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--input-border)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="downloads">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="new">Newest</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>

        {widgets.length === 0 && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="nav-btn primary" onClick={triggerSeeder} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed Sample Widgets'}
            </button>
          </div>
        )}
      </div>

      {seedSuccess && (
        <div style={{
          background: 'rgba(46, 164, 79, 0.1)',
          border: '1px solid rgba(46, 164, 79, 0.2)',
          color: 'var(--success-color)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          {seedSuccess}
        </div>
      )}

      {/* Widgets list loading / empty / populated */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ height: '210px', opacity: 0.6, animation: 'pulse 1.5s infinite' }}></div>
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px dashed var(--card-border)'
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Widgets Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            We couldn&apos;t find any widgets matching your selection. Try adjusting your filters or search query, or click the button above to seed sample data.
          </p>
        </div>
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
                height: '220px'
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
                      <ShieldCheck size={16} style={{ color: 'var(--accent-color)' }} title="Verified Official Widget" />
                    )}
                    {widget.openSource && (
                      <Code size={16} style={{ color: '#22c55e' }} title="Open Source Code" />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '0.4rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0 }}>{widget.name}</h3>
                  {widget.isVerified && (
                    <span style={{
                      fontSize: '0.68rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      ✔ Verified
                    </span>
                  )}
                  {widget.isFirefoxApp && (
                    <span style={{
                      fontSize: '0.68rem',
                      background: 'rgba(249, 115, 22, 0.15)',
                      color: '#fb923c',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      🔥 Firefox App
                    </span>
                  )}
                  {widget.cli && (
                    <span style={{
                      fontSize: '0.68rem',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontFamily: 'monospace',
                      fontWeight: '600'
                    }}>
                      &gt;_ {widget.cli}
                    </span>
                  )}
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>by <strong>{widget.author?.username || 'Akshit'}</strong></span>
                  {widget.author?.badges?.includes('Verified Developer') && (
                    <Award size={13} style={{ color: 'var(--accent-color)' }} title="Verified Developer" />
                  )}
                </div>

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

      {/* Animation pulse helper style */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
