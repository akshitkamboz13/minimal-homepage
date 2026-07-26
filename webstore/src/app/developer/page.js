'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Plus, Edit3, Trash2, CheckCircle, BarChart2, ShieldAlert, Award, FileText, Code2 } from 'lucide-react';

const CATEGORIES = [
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

export default function DeveloperConsolePage() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Tab control: 'dashboard', 'publish', 'edit'
  const [view, setView] = useState('dashboard');
  const [editingWidget, setEditingWidget] = useState(null);

  // Publish Form state
  const [formName, setFormName] = useState('');
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLongDesc, setFormLongDesc] = useState('');
  const [formVersion, setFormVersion] = useState('1.0.0');
  const [formCategory, setFormCategory] = useState('Productivity');
  const [formPermissions, setFormPermissions] = useState({
    fetch: false,
    clipboard: false,
    notifications: false,
    storage: false
  });
  const [formTags, setFormTags] = useState('');
  const [formScreenshots, setFormScreenshots] = useState('');
  const [formOpenSource, setFormOpenSource] = useState(false);
  const [formRepoUrl, setFormRepoUrl] = useState('');
  
  // Widget Source Code Form states
  const [formHtml, setFormHtml] = useState('');
  const [formCss, setFormCss] = useState('');
  const [formJs, setFormJs] = useState('');
  const [formEnv, setFormEnv] = useState('');

  // Version upgrade states for Edit mode
  const [editChangelogText, setEditChangelogText] = useState('');

  const [formError, setFormError] = useState('');
  const [securityIssues, setSecurityIssues] = useState([]);
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) setSession(data.user);
      }
    } catch (e) {}
    setLoadingSession(false);
  }

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/developer/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }

  // Decompress gzipped homewidget package
  async function decompressBlob(blob) {
    const decompressionStream = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(decompressionStream);
    const response = new Response(decompressedStream);
    return await response.text();
  }

  async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setFormError('');
      setFormSuccess('');
      let jsonText;
      try {
        jsonText = await decompressBlob(file);
      } catch (decompressErr) {
        // Fallback: try reading as plain text JSON
        jsonText = await file.text();
      }

      const widgetData = JSON.parse(jsonText);

      // Populate form state fields
      if (widgetData.name) setFormName(widgetData.name);
      if (widgetData.id) setFormIdentifier(widgetData.id);
      if (widgetData.description) setFormDescription(widgetData.description);
      if (widgetData.version) setFormVersion(widgetData.version);

      if (widgetData.category) {
        setFormCategory(widgetData.category);
      } else if (widgetData.type === 'widget') {
        setFormCategory('Customization');
      }

      if (widgetData.html !== undefined) setFormHtml(widgetData.html);
      if (widgetData.css !== undefined) setFormCss(widgetData.css);
      if (widgetData.js !== undefined) setFormJs(widgetData.js);
      if (widgetData.env !== undefined) setFormEnv(widgetData.env);

      const perms = widgetData.permissions || [];
      setFormPermissions({
        fetch: perms.includes('fetch'),
        clipboard: perms.includes('clipboard'),
        notifications: perms.includes('notifications'),
        storage: perms.includes('storage')
      });

      if (Array.isArray(widgetData.tags)) {
        setFormTags(widgetData.tags.join(', '));
      }

      setFormSuccess(`Successfully imported "${widgetData.name || 'widget'}"! Review details and screenshots below before saving/publishing.`);
    } catch (err) {
      console.error(err);
      setFormError('Failed to parse .homewidget package file. Make sure the file format is valid JSON or gzip compressed .homewidget.');
    }
  }

  // Handle new widget publish submission
  async function handlePublish(e) {
    e.preventDefault();
    setFormError('');
    setSecurityIssues([]);
    setFormSuccess('');

    const activePermissions = Object.keys(formPermissions).filter(p => formPermissions[p]);
    const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const screenshotsArray = formScreenshots.split('\n').map(s => s.trim()).filter(Boolean);

    if (screenshotsArray.length === 0) {
      setFormError('At least one screenshot URL is required.');
      return;
    }

    const payload = {
      name: formName,
      identifier: formIdentifier,
      description: formDescription,
      longDescription: formLongDesc,
      version: formVersion,
      category: formCategory,
      permissions: activePermissions,
      tags: tagsArray,
      screenshots: screenshotsArray,
      openSource: formOpenSource,
      repositoryUrl: formRepoUrl,
      html: formHtml,
      css: formCss,
      js: formJs,
      env: formEnv,
    };

    try {
      const res = await fetch('/api/widgets/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Widget published successfully!');
        resetForm();
        fetchStats();
        setView('dashboard');
      } else {
        setFormError(data.error || 'Failed to publish widget');
        if (data.issues) setSecurityIssues(data.issues);
      }
    } catch (err) {
      setFormError('Network error. Failed to publish.');
    }
  }

  // Handle widget edit update
  async function handleUpdate(e) {
    e.preventDefault();
    setFormError('');
    setSecurityIssues([]);
    setFormSuccess('');

    const activePermissions = Object.keys(formPermissions).filter(p => formPermissions[p]);
    const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const screenshotsArray = formScreenshots.split('\n').map(s => s.trim()).filter(Boolean);

    const payload = {
      name: formName,
      description: formDescription,
      longDescription: formLongDesc,
      version: formVersion,
      category: formCategory,
      permissions: activePermissions,
      tags: tagsArray,
      screenshots: screenshotsArray,
      openSource: formOpenSource,
      repositoryUrl: formRepoUrl,
      html: formHtml,
      css: formCss,
      js: formJs,
      env: formEnv,
      changes: editChangelogText.split('\n').map(c => c.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`/api/widgets/${editingWidget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Widget updated successfully!');
        fetchStats();
        setTimeout(() => setView('dashboard'), 1500);
      } else {
        setFormError(data.error || 'Failed to update widget');
        if (data.issues) setSecurityIssues(data.issues);
      }
    } catch (err) {
      setFormError('Network error. Failed to update.');
    }
  }

  async function handleDelete(widgetId) {
    if (!confirm('Are you sure you want to delete this widget listing forever? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/widgets/${widgetId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(widget) {
    setEditingWidget(widget);
    setFormName(widget.name);
    setFormIdentifier(widget.identifier);
    setFormDescription(widget.description);
    setFormLongDesc(widget.longDescription || '');
    setFormVersion(widget.version);
    setFormCategory(widget.category);
    setFormPermissions({
      fetch: widget.permissions.includes('fetch'),
      clipboard: widget.permissions.includes('clipboard'),
      notifications: widget.permissions.includes('notifications'),
      storage: widget.permissions.includes('storage')
    });
    setFormTags(widget.tags.join(', '));
    setFormScreenshots(widget.screenshots.join('\n'));
    setFormOpenSource(widget.openSource);
    setFormRepoUrl(widget.repositoryUrl || '');
    setFormHtml(widget.html || '');
    setFormCss(widget.css || '');
    setFormJs(widget.js || '');
    setFormEnv(widget.env || '');
    setEditChangelogText('');
    setFormError('');
    setSecurityIssues([]);
    setFormSuccess('');
    setView('edit');
  }

  function resetForm() {
    setFormName('');
    setFormIdentifier('');
    setFormDescription('');
    setFormLongDesc('');
    setFormVersion('1.0.0');
    setFormCategory('Productivity');
    setFormPermissions({ fetch: false, clipboard: false, notifications: false, storage: false });
    setFormTags('');
    setFormScreenshots('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400');
    setFormOpenSource(false);
    setFormRepoUrl('');
    setFormHtml('<!-- HTML code -->\n<div class="hello">Hello</div>');
    setFormCss('/* CSS code */\n.hello { color: red; }');
    setFormJs('// JS code\nconsole.log("Ready");');
    setFormEnv('API_KEY=your_key');
    setEditChangelogText('');
  }

  if (loadingSession) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.7 }}>Checking developer session...</div>;
  }

  if (!session) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
        <ShieldAlert size={48} style={{ color: 'var(--accent-color)', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          You must log in with a developer account to access the Developer Console and publish widgets.
        </p>
        <Link href="/login" className="btn btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header tabs navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard className="brand-icon" style={{ color: 'var(--accent-color)' }} />
            <span>Developer Console</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Welcome back, <strong>{session.username}</strong></p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setView('dashboard'); fetchStats(); }}
            className={`btn ${view === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            Dashboard
          </button>
          <button
            onClick={() => { resetForm(); setView('publish'); }}
            className={`btn ${view === 'publish' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <Plus size={14} />
            <span>Publish Widget</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div>
          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.7 }}>Loading analytics...</div>
          ) : !stats || !stats.hasWidgets ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px dashed var(--card-border)'
            }}>
              <FileText size={36} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.7 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Listings Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                You have not published any widgets yet. Publish your first widget to unlock analytic charts, adoption data, and user reviews.
              </p>
              <button onClick={() => setView('publish')} className="btn btn-primary">
                Publish Your First Widget
              </button>
            </div>
          ) : (
            <div>
              {/* Analytics overview row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-color)', padding: '12px', borderRadius: '12px' }}>
                    <Plus size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.widgetsCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Widgets Published</div>
                  </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '12px', borderRadius: '12px' }}>
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalDownloads}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Installs</div>
                  </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '12px', borderRadius: '12px' }}>
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{stats.averageRating}</span>
                      <Award size={16} style={{ color: '#fbbf24' }} fill="currentColor" />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg. User Rating</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* CSS Downloads Bar Chart */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Weekly Installs History</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', padding: '0 1rem' }}>
                    {stats.weeklyInstallsHistory.map((item, idx) => {
                      // Calculate height percentage
                      const maxVal = Math.max(...stats.weeklyInstallsHistory.map(h => h.value), 1);
                      const heightPercent = `${Math.max(10, (item.value / maxVal) * 100)}%`;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{item.value}</span>
                          <div style={{
                            height: '120px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-end'
                          }}>
                            <div style={{
                              height: heightPercent,
                              width: '100%',
                              background: 'var(--accent-color)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ratings Breakdown percentage bars */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Ratings Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[5, 4, 3, 2, 1].map(stars => {
                      const count = stats.ratingsDistribution[stars] || 0;
                      const totalReviews = Object.values(stats.ratingsDistribution).reduce((a, b) => a + b, 0);
                      const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                          <span style={{ width: '45px', fontWeight: 'bold' }}>{stars} Star</span>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '10px', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                            <div style={{ width: `${percent}%`, background: '#fbbf24', height: '100%' }} />
                          </div>
                          <span style={{ width: '30px', textAlign: 'right', color: 'var(--text-secondary)' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Published Widgets listing */}
              <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Widget Listings</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '10px 15px' }}>Widget Name</th>
                        <th style={{ padding: '10px 15px' }}>Category</th>
                        <th style={{ padding: '10px 15px' }}>Version</th>
                        <th style={{ padding: '10px 15px' }}>Weekly Active Users</th>
                        <th style={{ padding: '10px 15px' }}>Downloads</th>
                        <th style={{ padding: '10px 15px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.widgetsList.map(widget => (
                        <tr key={widget.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>
                            <Link href={`/widget/${widget.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                              {widget.name}
                            </Link>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{widget.identifier}</div>
                          </td>
                          <td style={{ padding: '12px 15px' }}>{widget.category}</td>
                          <td style={{ padding: '12px 15px' }}>v{widget.version}</td>
                          <td style={{ padding: '12px 15px' }}>{widget.weeklyActive}</td>
                          <td style={{ padding: '12px 15px' }}>{widget.downloads}</td>
                          <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  const original = stats.widgetsList.find(w => w.id === widget.id);
                                  // Fetch full widget details to pre-populate correctly including full code
                                  fetch(`/api/widgets/${widget.id}`)
                                    .then(res => res.json())
                                    .then(wData => startEdit(wData));
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Edit widget listing details and source code"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(widget.id)}
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PUBLISH OR EDIT FORM VIEW */}
      {(view === 'publish' || view === 'edit') && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            {view === 'publish' ? 'Publish a New Custom Widget' : `Edit Listing: ${formName}`}
          </h3>

          {view === 'publish' && (
            <div 
              style={{
                border: '2px dashed var(--card-border)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.01)',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onClick={() => document.getElementById('widget-file-upload').click()}
            >
              <input
                type="file"
                id="widget-file-upload"
                accept=".homewidget"
                style={{ display: 'none' }}
                onChange={handleFileImport}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                Import from .homewidget package
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Drag and drop a <code>.homewidget</code> file or click to browse. Unpacks code, manifest and configuration automatically.
              </span>
            </div>
          )}

          {formError && (
            <div style={{
              background: 'rgba(218, 54, 55, 0.1)',
              border: '1px solid rgba(218, 54, 55, 0.2)',
              color: 'var(--error-color)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '1.5rem'
            }}>
              {formError}
            </div>
          )}

          {securityIssues.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: 'var(--warning-color)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldAlert size={16} />
                <span>Security Sandbox Warning</span>
              </div>
              <ul style={{ paddingLeft: '1.2rem' }}>
                {securityIssues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </div>
          )}

          {formSuccess && (
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
              {formSuccess}
            </div>
          )}

          <form onSubmit={view === 'publish' ? handlePublish : handleUpdate}>
            {/* Metadata Fields Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" htmlFor="w-name">Widget Name</label>
                <input
                  type="text"
                  id="w-name"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Pomodoro Timer"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="w-identifier">
                  Unique Identifier {view === 'edit' && '(Read-only)'}
                </label>
                <input
                  type="text"
                  id="w-identifier"
                  className="form-input"
                  value={formIdentifier}
                  onChange={(e) => setFormIdentifier(e.target.value)}
                  placeholder="e.g. com.example.pomodoro"
                  disabled={view === 'edit'}
                  required
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="w-desc">Short Description (max 120 chars)</label>
                <input
                  type="text"
                  id="w-desc"
                  className="form-input"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Clean focus timer with circles progress."
                  maxLength={120}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="w-version">Version</label>
                <input
                  type="text"
                  id="w-version"
                  className="form-input"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="e.g. 1.0.0"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="w-category">Category</label>
                <select
                  id="w-category"
                  className="form-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  required
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="w-tags">Tags (comma-separated, max 10)</label>
                <input
                  type="text"
                  id="w-tags"
                  className="form-input"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="focus, study, timer, productivity"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="w-longdesc">Detailed Listing About Section (Markdown or plain text)</label>
              <textarea
                id="w-longdesc"
                className="form-input"
                value={formLongDesc}
                onChange={(e) => setFormLongDesc(e.target.value)}
                placeholder="Give details about your widget, how it works, what configuration settings are available..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Screenshots and Repository */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" htmlFor="w-screenshots">Screenshots URLs (one per line, min. 1)</label>
                <textarea
                  id="w-screenshots"
                  className="form-input"
                  value={formScreenshots}
                  onChange={(e) => setFormScreenshots(e.target.value)}
                  placeholder="https://example.com/screenshot1.png"
                  rows={3}
                  required
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <label className="form-label">Permissions checklist</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                    {Object.keys(formPermissions).map(perm => (
                      <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formPermissions[perm]}
                          onChange={(e) => setFormPermissions({ ...formPermissions, [perm]: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{perm === 'fetch' ? 'fetch (network)' : perm}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={formOpenSource}
                      onChange={(e) => setFormOpenSource(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Open Source Repository Badge</span>
                  </label>

                  {formOpenSource && (
                    <div style={{ flex: 1 }}>
                      <input
                        type="url"
                        className="form-input"
                        value={formRepoUrl}
                        onChange={(e) => setFormRepoUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        style={{ height: '36px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Version Changelog for Editing widgets */}
            {view === 'edit' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="edit-changes">Changelog items for version {formVersion} (one per line)</label>
                <textarea
                  id="edit-changes"
                  className="form-input"
                  value={editChangelogText}
                  onChange={(e) => setEditChangelogText(e.target.value)}
                  placeholder="e.g. Added dark mode toggle&#10;Fixed resizing bounds bug&#10;Optimized tick intervals"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            {/* Source Code Files tab section */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={18} style={{ color: 'var(--accent-color)' }} />
                <span>Widget Code Assets</span>
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="form-label">HTML Code</label>
                  <textarea
                    className="form-input"
                    value={formHtml}
                    onChange={(e) => setFormHtml(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">CSS Code</label>
                  <textarea
                    className="form-input"
                    value={formCss}
                    onChange={(e) => setFormCss(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="form-label">JavaScript Logic</label>
                  <textarea
                    className="form-input"
                    value={formJs}
                    onChange={(e) => setFormJs(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="form-label">Environment Variables Template (.env format)</label>
                  <textarea
                    className="form-input"
                    value={formEnv}
                    onChange={(e) => setFormEnv(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                    placeholder="API_KEY=xxx&#10;DEFAULT_LIMIT=10"
                  />
                </div>
              </div>
            </div>

            {/* Actions button row */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="btn btn-primary"
              >
                {view === 'publish' ? 'Publish Listing' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
