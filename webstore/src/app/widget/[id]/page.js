'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Download, ShieldCheck, Code, Award, Calendar, AlertTriangle, ArrowLeft, Send } from 'lucide-react';

export default function WidgetDetailsPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();

  const [widget, setWidget] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Developer reply states
  const [replyText, setReplyText] = useState({});
  const [replyError, setReplyError] = useState('');

  // Install button states
  const [installStatus, setInstallStatus] = useState('install'); // install, installing, installed

  useEffect(() => {
    fetchData();
    fetchSession();

    // Listen for extension installation callback
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'install-success' && e.data.widgetId === widget?.identifier) {
        setInstallStatus('installed');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, widget?.identifier]);

  async function fetchData() {
    try {
      const widgetRes = await fetch(`/api/widgets/${id}`);
      if (!widgetRes.ok) {
        router.push('/');
        return;
      }
      const widgetData = await widgetRes.json();
      setWidget(widgetData);

      const reviewsRes = await fetch(`/api/widgets/${id}/reviews`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) setSession(data.user);
      }
    } catch (e) {}
  }

  async function handleInstall() {
    if (!widget) return;
    setInstallStatus('installing');

    // 1. Record download count in database
    try {
      await fetch(`/api/widgets/${id}/download`, { method: 'POST' });
    } catch (e) {}

    // 2. Install inside extension via iframe parent communication
    const inIframe = window.self !== window.top;
    if (inIframe) {
      // Format payload matching startpage registry
      const widgetType = widget.category === 'Customization' ? 'widget' : 'app';
      
      window.parent.postMessage({
        type: 'install-widget',
        widget: {
          id: widget.identifier,
          name: widget.name,
          version: widget.version,
          author: widget.author.username,
          type: widgetType,
          icon: widget.screenshots[0] || '',
          html: widget.html,
          css: widget.css,
          js: widget.js,
          env: widget.env,
          permissions: widget.permissions,
          category: widget.category,
          tags: widget.tags
        }
      }, '*');

      // Set timeout as fallback
      setTimeout(() => {
        setInstallStatus('installed');
      }, 1500);
    } else {
      // 3. Standalone browser fallback: Download .homewidget manifest config file
      const widgetType = widget.category === 'Customization' ? 'widget' : 'app';
      const backupPkg = {
        id: widget.identifier,
        name: widget.name,
        version: widget.version,
        author: widget.author?.username || widget.author || 'si4k',
        type: widgetType,
        icon: widget.screenshots[0] || '',
        html: widget.html || '',
        css: widget.css || '',
        js: widget.js || '',
        env: widget.env || '',
        files: widget.files || [],
        cli: widget.cli || '',
        isFirefoxApp: !!widget.isFirefoxApp,
        permissions: widget.permissions || [],
        category: widget.category
      };

      const blob = new Blob([JSON.stringify(backupPkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widget.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.homewidget`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setInstallStatus('installed');
      setTimeout(() => setInstallStatus('install'), 3000);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!comment) return;

    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await fetch(`/api/widgets/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewSuccess('Review saved successfully!');
        setComment('');
        fetchData(); // Reload widget and reviews
      } else {
        setReviewError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError('Network error, please try again.');
    }
  }

  async function submitReply(reviewId) {
    const text = replyText[reviewId];
    if (!text) return;

    setReplyError('');

    try {
      const res = await fetch(`/api/widgets/${id}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text }),
      });

      if (res.ok) {
        setReplyText({ ...replyText, [reviewId]: '' });
        fetchData();
      } else {
        const data = await res.json();
        setReplyError(data.error || 'Failed to submit reply');
      }
    } catch (err) {
      setReplyError('Network error.');
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.7 }}>Loading widget details...</div>;
  }

  if (!widget) return null;

  const isAuthor = session && widget.author?._id === session.id;

  return (
    <div>
      {/* Back button */}
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Side: Metadata & Screenshots */}
        <div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            {/* Mock icon from screenshots or letter */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {widget.name.substring(0, 1).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0px' }}>{widget.name}</h1>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--card-border)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>{widget.category}</span>

                {widget.isVerified && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '600'
                  }}>
                    ✔ Verified
                  </span>
                )}
                {widget.isFirefoxApp && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(249, 115, 22, 0.15)',
                    color: '#fb923c',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: '600'
                  }}>
                    🔥 Firefox App
                  </span>
                )}
                {widget.cli && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}>
                    &gt;_ {widget.cli}
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '6px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>by </span>
                  <Link href={`/profile/${widget.author?.username}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600' }}>
                    {widget.author?.username}
                  </Link>
                  {widget.author?.badges?.includes('Verified Developer') && (
                    <Award size={14} style={{ color: 'var(--accent-color)' }} title="Verified Developer" />
                  )}
                </div>
                <span>v{widget.version}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={14} className="star-filled" fill="currentColor" />
                  <strong>{widget.averageRating}</strong> ({widget.ratingsCount} reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Screenshots gallery */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Screenshots</h3>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
              {widget.screenshots.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Screenshot ${i + 1}`}
                  style={{
                    height: '200px',
                    borderRadius: '12px',
                    border: '1px solid var(--card-border)',
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ))}
            </div>
          </div>

          {/* Widget description */}
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>About Widget</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {widget.longDescription || widget.description}
            </p>
          </div>

          {/* Changelog section */}
          {widget.changelog && widget.changelog.length > 0 && (
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Version History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {widget.changelog.map((log, i) => (
                  <div key={i} style={{
                    paddingLeft: '12px',
                    borderLeft: '2px solid var(--accent-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <span>Version {log.version}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {log.changes.map((change, cIdx) => <li key={cIdx}>{change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Install actions, details, permissions checklist */}
        <div>
          {/* Action Card */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <button
              onClick={handleInstall}
              disabled={installStatus === 'installing'}
              className="btn btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '1rem' }}
            >
              {installStatus === 'install' && (
                <>
                  <Download size={18} />
                  <span>{window.self !== window.top ? 'Install in Home' : 'Download Package'}</span>
                </>
              )}
              {installStatus === 'installing' && <span>Installing...</span>}
              {installStatus === 'installed' && <span>Success / Ready!</span>}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {window.self !== window.top
                ? 'Adds widget instantly to your homepage panels/apps dock.'
                : 'Downloads .homewidget package for manual import.'}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--card-border)'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{widget.downloadsCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Installs</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                  <span>{widget.averageRating}</span>
                  <Star size={14} className="star-filled" fill="currentColor" />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</div>
              </div>
            </div>
          </div>

          {/* Properties Table */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Widget Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Identifier</span>
                <span style={{ fontFamily: 'monospace' }}>{widget.identifier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Category</span>
                <span>{widget.category}</span>
              </div>
              {widget.cli && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>CLI Trigger</span>
                  <span style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 'bold' }}>&gt;_ {widget.cli}</span>
                </div>
              )}
              {widget.files && widget.files.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Package Structure</span>
                  <span style={{ fontWeight: '500' }}>{widget.files.length} Files</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Open Source</span>
                <span>{widget.openSource ? '✓ Yes' : 'No'}</span>
              </div>
              {widget.openSource && widget.repositoryUrl && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Repository</span>
                  <a href={widget.repositoryUrl} target="_blank" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                    View Code
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Compatibility</span>
                <span>Requires Home 2.0+</span>
              </div>
            </div>
          </div>

          {/* Permissions Requirement Table */}
          <div className="glass-card" style={{ fontSize: '0.85rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-color)' }} />
              <span>Permissions System</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Declared runtime hooks. Permissions are strictly checked and enforced inside the extension sandbox.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'fetch', label: 'Internet Access (fetch API)' },
                { key: 'clipboard', label: 'Clipboard access' },
                { key: 'notifications', label: 'Native notifications' },
                { key: 'storage', label: 'Persistent storage' }
              ].map(perm => {
                const requested = widget.permissions.includes(perm.key);
                return (
                  <div key={perm.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: requested ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                    border: '1px solid',
                    borderColor: requested ? 'rgba(245, 158, 11, 0.15)' : 'var(--card-border)',
                    borderRadius: '6px'
                  }}>
                    <span style={{ fontWeight: requested ? 'bold' : 'normal', color: requested ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {perm.label}
                    </span>
                    <span style={{
                      color: requested ? 'var(--accent-color)' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {requested ? '☑ Required' : '☐ None'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Review System Section */}
      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>User Reviews</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Write a review form */}
          <div>
            {session ? (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Write a Review</h3>

                {reviewError && <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{reviewError}</div>}
                {reviewSuccess && <div style={{ color: 'var(--success-color)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{reviewSuccess}</div>}

                <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Rating</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      style={{
                        background: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--input-border)',
                        padding: '8px',
                        borderRadius: '8px',
                        width: '100%',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5 - Perfect)</option>
                      <option value="4">⭐⭐⭐⭐☆ (4 - Good)</option>
                      <option value="3">⭐⭐⭐☆☆ (3 - Okay)</option>
                      <option value="2">⭐⭐☆☆☆ (2 - Poor)</option>
                      <option value="1">⭐☆☆☆☆ (1 - Terrible)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="comment">Comment</label>
                    <textarea
                      id="comment"
                      className="form-input"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts about this widget..."
                      rows={4}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary">Submit Review</button>
                </form>
              </div>
            ) : (
              <div className="glass-card" style={{ textStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  You must be logged in to leave a review.
                </p>
                <Link href="/login" className="nav-btn primary" style={{ display: 'inline-flex' }}>
                  Log In
                </Link>
              </div>
            )}
          </div>

          {/* Reviews list */}
          <div>
            {reviews.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: '0.9rem', padding: '2rem 0' }}>No reviews yet. Be the first to leave one!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map((rev) => (
                  <div key={rev._id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{rev.user?.username}</strong>
                        {rev.user?.badges?.includes('Verified Developer') && (
                          <Award size={13} style={{ color: 'var(--accent-color)' }} />
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', color: '#fbbf24' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < rev.rating ? 'currentColor' : 'none'} style={{ opacity: i < rev.rating ? 1 : 0.2 }} />
                        ))}
                      </div>
                    </div>

                    <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {rev.comment}
                    </p>

                    {/* Developer Response */}
                    {rev.developerResponse ? (
                      <div style={{
                        marginTop: '1rem',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        borderLeft: '2px solid var(--accent-color)',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Response from Developer</span>
                          <Award size={12} style={{ color: 'var(--accent-color)' }} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)' }}>{rev.developerResponse.comment}</p>
                      </div>
                    ) : (
                      /* Display reply input only if the current user is the author of this widget */
                      isAuthor && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={replyText[rev._id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [rev._id]: e.target.value })}
                            placeholder="Write a public developer response..."
                            style={{ height: '36px', fontSize: '0.8rem' }}
                          />
                          <button
                            onClick={() => submitReply(rev._id)}
                            className="btn btn-secondary"
                            style={{ padding: '0 12px', height: '36px' }}
                            title="Send developer response"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
