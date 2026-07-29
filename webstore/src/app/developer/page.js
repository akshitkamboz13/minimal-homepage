'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Plus, Edit3, Trash2, CheckCircle, BarChart2, ShieldAlert, Award, FileText, Code2, FolderOpen, FilePlus, FolderPlus, FolderInput, X, ChevronRight, ChevronDown } from 'lucide-react';

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

const cleanPath = (path) => path.trim().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');

// Older packages could accidentally contain a placeholder folder ("html") and
// a sibling file ("testing.html"). If the package already references
// html/testing.html, preserve the intended package structure on import.
function normalizePackageFiles(files) {
  const sourceFiles = files.map(file => ({ ...file, name: cleanPath(file.name || '') })).filter(file => file.name);
  const folderPlaceholders = sourceFiles.filter(file => !file.name.includes('/') && !file.name.includes('.'));
  const consumedPlaceholders = new Set();

  const normalized = sourceFiles.map(file => {
    if (file.name.includes('/')) return file;
    const folder = folderPlaceholders.find(candidate => {
      const target = `${candidate.name}/${file.name}`;
      return candidate.name !== file.name && sourceFiles.some(source => String(source.content || '').includes(target));
    });

    if (!folder) return file;
    consumedPlaceholders.add(folder.name);
    return { ...file, name: `${folder.name}/${file.name}` };
  });

  return normalized.filter(file => !consumedPlaceholders.has(file.name));
}

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
  const [formCli, setFormCli] = useState('');
  const [formIsFirefoxApp, setFormIsFirefoxApp] = useState(false);
  
  // Multi-file editor state
  const [formFiles, setFormFiles] = useState([
    { name: 'index.html', content: '<!-- HTML code -->\n<div class="hello">Hello World</div>' },
    { name: 'style.css', content: '/* CSS code */\n.hello { color: red; }' },
    { name: 'app.js', content: '// JS code\nconsole.log("Ready");' },
  ]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [formFolders, setFormFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newEntryType, setNewEntryType] = useState('file');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [fileEditorError, setFileEditorError] = useState('');

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
      if (widgetData.identifier || widgetData.id) setFormIdentifier(widgetData.identifier || widgetData.id);
      if (widgetData.description) setFormDescription(widgetData.description);
      if (widgetData.version) setFormVersion(widgetData.version);
      if (widgetData.cli) setFormCli(widgetData.cli);
      if (widgetData.isFirefoxApp) setFormIsFirefoxApp(!!widgetData.isFirefoxApp);

      if (widgetData.category) {
        setFormCategory(widgetData.category);
      } else if (widgetData.type === 'widget') {
        setFormCategory('Customization');
      }

      // Populate multi-file editor
      if (Array.isArray(widgetData.files) && widgetData.files.length > 0) {
        setFormFiles(normalizePackageFiles(widgetData.files));
      } else {
        // Legacy single-file format: reconstruct file array
        const legacyFiles = [];
        if (widgetData.html !== undefined) legacyFiles.push({ name: 'index.html', content: widgetData.html });
        if (widgetData.css !== undefined) legacyFiles.push({ name: 'style.css', content: widgetData.css });
        if (widgetData.js !== undefined) legacyFiles.push({ name: 'app.js', content: widgetData.js });
        if (widgetData.env !== undefined) legacyFiles.push({ name: '.env', content: widgetData.env });
        if (legacyFiles.length > 0) setFormFiles(legacyFiles);
      }
      setActiveFileIdx(0);

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

    // Derive legacy html/css/js/env from files array for backward compat
    const htmlFile = formFiles.find(f => f.name === 'index.html' || f.name.endsWith('.html'));
    const cssFile = formFiles.find(f => f.name === 'style.css' || f.name.endsWith('.css'));
    const jsFile = formFiles.find(f => f.name === 'app.js' || (f.name.endsWith('.js') && !f.name.includes('/')));
    const envFile = formFiles.find(f => f.name === '.env' || f.name === 'env');

    const payload = {
      name: formName,
      identifier: formIdentifier,
      description: formDescription,
      longDescription: formLongDesc,
      version: formVersion,
      category: formCategory,
      cli: formCli,
      isFirefoxApp: formIsFirefoxApp,
      permissions: activePermissions,
      tags: tagsArray,
      screenshots: screenshotsArray,
      openSource: formOpenSource,
      repositoryUrl: formRepoUrl,
      files: formFiles,
      html: htmlFile?.content || '',
      css: cssFile?.content || '',
      js: jsFile?.content || '',
      env: envFile?.content || '',
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

    // Derive legacy html/css/js/env from files array for backward compat
    const htmlFile = formFiles.find(f => f.name === 'index.html' || f.name.endsWith('.html'));
    const cssFile = formFiles.find(f => f.name === 'style.css' || f.name.endsWith('.css'));
    const jsFile = formFiles.find(f => f.name === 'app.js' || (f.name.endsWith('.js') && !f.name.includes('/')));
    const envFile = formFiles.find(f => f.name === '.env' || f.name === 'env');

    const payload = {
      name: formName,
      description: formDescription,
      longDescription: formLongDesc,
      version: formVersion,
      category: formCategory,
      cli: formCli,
      isFirefoxApp: formIsFirefoxApp,
      permissions: activePermissions,
      tags: tagsArray,
      screenshots: screenshotsArray,
      openSource: formOpenSource,
      repositoryUrl: formRepoUrl,
      files: formFiles,
      html: htmlFile?.content || '',
      css: cssFile?.content || '',
      js: jsFile?.content || '',
      env: envFile?.content || '',
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
    setFormCli(widget.cli || '');
    setFormIsFirefoxApp(!!widget.isFirefoxApp);
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
    // Multi-file editor: use files array if available, fallback to legacy
    if (Array.isArray(widget.files) && widget.files.length > 0) {
      setFormFiles(normalizePackageFiles(widget.files));
    } else {
      const legacyFiles = [];
      if (widget.html) legacyFiles.push({ name: 'index.html', content: widget.html });
      if (widget.css) legacyFiles.push({ name: 'style.css', content: widget.css });
      if (widget.js) legacyFiles.push({ name: 'app.js', content: widget.js });
      if (widget.env) legacyFiles.push({ name: '.env', content: widget.env });
      setFormFiles(legacyFiles.length > 0 ? legacyFiles : [
        { name: 'index.html', content: '' },
        { name: 'style.css', content: '' },
        { name: 'app.js', content: '' },
      ]);
    }
    setActiveFileIdx(0);
    setFormFolders([]);
    setSelectedFolder('');
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
    setFormCli('');
    setFormIsFirefoxApp(false);
    setFormFiles([
      { name: 'index.html', content: '<!-- HTML code -->\n<div class="hello">Hello World</div>' },
      { name: 'style.css', content: '/* CSS code */\n.hello { color: red; }' },
      { name: 'app.js', content: '// JS code\nconsole.log("Ready");' },
    ]);
    setActiveFileIdx(0);
    setFormFolders([]);
    setSelectedFolder('');
    setFileEditorError('');
    setEditChangelogText('');
  }

  function createEditorEntry() {
    const enteredName = cleanPath(newFileName);
    if (!enteredName) return;

    setFileEditorError('');
    if (newEntryType === 'folder') {
      if (enteredName.split('/').some(segment => segment.includes('.'))) {
        setFileEditorError('Folder names cannot contain a file extension.');
        return;
      }
      if (formFolders.includes(enteredName)) {
        setFileEditorError('That folder already exists.');
        return;
      }
      setFormFolders(folders => [...folders, enteredName]);
      setExpandedFolders(folders => ({ ...folders, [enteredName]: true }));
      setSelectedFolder(enteredName);
      setNewFileName('');
      setShowNewFileInput(false);
      return;
    }

    const name = enteredName.includes('/') || !selectedFolder
      ? enteredName
      : `${selectedFolder}/${enteredName}`;
    const baseName = name.split('/').pop();
    if (!baseName.includes('.')) {
      setFileEditorError('Use “Add Folder” for folders, then add a file with an extension.');
      return;
    }
    if (formFiles.some(file => file.name === name)) {
      setFileEditorError('A file already exists at that path.');
      return;
    }
    const ext = baseName.split('.').pop().toLowerCase();
    const defaults = { html: '<!-- HTML content -->', css: '/* CSS content */', js: '// JS content', json: '{}', md: '# Readme', env: 'KEY=value' };
    const newFiles = [...formFiles, { name, content: defaults[ext] || '' }];
    setFormFiles(newFiles);
    setActiveFileIdx(newFiles.length - 1);
    setNewFileName('');
    setShowNewFileInput(false);
  }

  function moveFileToSelectedFolder(idx) {
    if (!selectedFolder) {
      setFileEditorError('Select a folder in the explorer before moving a file.');
      return;
    }
    const file = formFiles[idx];
    const targetName = `${selectedFolder}/${file.name.split('/').pop()}`;
    if (file.name === targetName) return;
    if (formFiles.some((candidate, candidateIdx) => candidateIdx !== idx && candidate.name === targetName)) {
      setFileEditorError(`“${targetName}” already exists.`);
      return;
    }
    setFormFiles(files => files.map((candidate, candidateIdx) => candidateIdx === idx ? { ...candidate, name: targetName } : candidate));
    setExpandedFolders(folders => ({ ...folders, [selectedFolder]: true }));
    setFileEditorError('');
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
                <label className="form-label" htmlFor="w-cli">CLI Command Alias (unique shortcut, e.g. &apos;gh&apos;, &apos;weather&apos;)</label>
                <input
                  type="text"
                  id="w-cli"
                  className="form-input"
                  value={formCli}
                  onChange={(e) => setFormCli(e.target.value)}
                  placeholder="e.g. pomo, weather, gh"
                  style={{ fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Must be unique across all published webstore widgets if provided.</span>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  id="w-firefox"
                  checked={formIsFirefoxApp}
                  onChange={(e) => setFormIsFirefoxApp(e.target.checked)}
                />
                <label htmlFor="w-firefox" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Mark as Firefox App / Compatible
                </label>
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

            {/* Multi-File Widget Editor */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={18} style={{ color: 'var(--accent-color)' }} />
                  <span>Widget Package Files</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1px 8px', borderRadius: '10px', fontWeight: '600', fontFamily: 'monospace' }}>
                    {formFiles.length} file{formFiles.length !== 1 ? 's' : ''}
                  </span>
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setNewEntryType('folder'); setNewFileName(''); setFileEditorError(''); setShowNewFileInput(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    <FolderPlus size={14} /> Add Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewEntryType('file'); setNewFileName(''); setFileEditorError(''); setShowNewFileInput(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--accent-color)', background: 'transparent', color: 'var(--accent-color)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    <FilePlus size={14} /> Add File
                  </button>
                </div>
              </div>

              {/* New file name input */}
              {showNewFileInput && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createEditorEntry();
                      }
                      if (e.key === 'Escape') { setShowNewFileInput(false); setNewFileName(''); }
                    }}
                    placeholder={newEntryType === 'folder' ? 'e.g. html or assets/images' : selectedFolder ? `File will be added to ${selectedFolder}/` : 'e.g. html/popup.html, js/utils.js, manifest.json'}
                    autoFocus
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, height: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      createEditorEntry();
                    }}
                    className="btn btn-primary"
                    style={{ height: '36px', padding: '0 14px', fontSize: '0.82rem' }}
                  >Create</button>
                  <button
                    type="button"
                    onClick={() => { setShowNewFileInput(false); setNewFileName(''); setFileEditorError(''); }}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  ><X size={14} /></button>
                </div>
              )}
              {fileEditorError && (
                <p role="alert" style={{ color: 'var(--error-color)', fontSize: '0.78rem', margin: '-0.5rem 0 1rem' }}>{fileEditorError}</p>
              )}

              {/* File editor split: tree + code area */}
              <div style={{ display: 'flex', gap: '0', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', minHeight: '420px' }}>

                {/* File Tree Sidebar */}
                <div style={{ width: '200px', flexShrink: 0, background: 'rgba(0,0,0,0.15)', borderRight: '1px solid var(--card-border)', overflowY: 'auto' }}>
                  <div style={{ padding: '8px 10px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)' }}>
                    File Explorer
                  </div>
                  {(() => {
                    // Build a recursive N-level folder tree from flat file paths
                    function buildTree(files, folders) {
                      const tree = { __files: [] };
                      folders.forEach(folderPath => {
                        let node = tree;
                        folderPath.split('/').forEach(segment => {
                          if (!node[segment]) node[segment] = { __files: [] };
                          node = node[segment];
                        });
                      });
                      files.forEach(({ file, idx }) => {
                        const parts = file.name.split('/');
                        let node = tree;
                        for (let i = 0; i < parts.length - 1; i++) {
                          const seg = parts[i];
                          if (!node[seg]) node[seg] = { __files: [] };
                          node = node[seg];
                        }
                        node.__files.push({ file, idx, shortName: parts[parts.length - 1] });
                      });
                      return tree;
                    }

                    const tree = buildTree(formFiles.map((file, idx) => ({ file, idx })), formFolders);

                    const getFileIcon = (name) => {
                      const ext = name.split('.').pop().toLowerCase();
                      const icons = { html: '🌐', css: '🎨', js: '⚡', json: '📋', md: '📝', env: '🔑', png: '🖼', jpg: '🖼', svg: '🎭' };
                      return icons[ext] || '📄';
                    };

                    const FileRow = ({ file, idx, label, depth = 0 }) => (
                      <div
                        onClick={() => setActiveFileIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 10px',
                          paddingLeft: `${10 + depth * 16}px`,
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          background: activeFileIdx === idx ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                          borderLeft: activeFileIdx === idx ? '2px solid var(--accent-color)' : '2px solid transparent',
                          color: activeFileIdx === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
                          transition: 'all 0.12s'
                        }}
                        onMouseEnter={e => { if (activeFileIdx !== idx) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (activeFileIdx !== idx) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <span style={{ fontSize: '0.85em', flexShrink: 0 }}>{getFileIcon(label || file.name)}</span>
                          <span title={file.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label || file.name}</span>
                        </span>
                        {formFiles.length > 1 && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); moveFileToSelectedFolder(idx); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: selectedFolder ? 0.7 : 0.35, padding: '0 2px', color: 'inherit', flexShrink: 0, lineHeight: 1 }}
                            title={selectedFolder ? `Move to ${selectedFolder}` : 'Select a folder to move this file'}
                          >
                            <FolderInput size={11} />
                          </button>
                        )}
                        {formFiles.length > 1 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              const updated = formFiles.filter((_, i) => i !== idx);
                              setFormFiles(updated);
                              setActiveFileIdx(Math.min(activeFileIdx, updated.length - 1));
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0, padding: '0 2px', color: 'inherit', flexShrink: 0, lineHeight: 1, transition: 'opacity 0.15s' }}
                            className="file-row-delete"
                            title="Remove file"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );

                    // Recursively render a tree node
                    function RenderNode({ node, path = [], depth = 0 }) {
                      const folderKeys = Object.keys(node).filter(k => k !== '__files');
                      const files = node.__files || [];
                      return (
                        <div>
                          {/* Sub-folders */}
                          {folderKeys.map(folderName => {
                            const folderPath = [...path, folderName].join('/');
                            const isExpanded = expandedFolders[folderPath] !== false;
                            const childFileCount = countFiles(node[folderName]);
                            return (
                              <div key={folderName}>
                                {/* Folder header */}
                                <div
                                  onClick={() => { setSelectedFolder(folderPath); setExpandedFolders(ef => ({ ...ef, [folderPath]: !isExpanded })); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '4px 10px', paddingLeft: `${10 + depth * 16}px`,
                                    cursor: 'pointer', fontSize: '0.78rem',
                                    color: selectedFolder === folderPath ? 'var(--text-primary)' : 'var(--text-secondary)', userSelect: 'none',
                                    background: selectedFolder === folderPath ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                                    transition: 'background 0.1s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                  onMouseLeave={e => { e.currentTarget.style.background = selectedFolder === folderPath ? 'rgba(139, 92, 246, 0.12)' : 'transparent'; }}
                                >
                                  <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, display: 'flex' }}>
                                    {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                  </span>
                                  <span style={{ fontSize: '0.85em', flexShrink: 0 }}>
                                    {isExpanded ? '📂' : '📁'}
                                  </span>
                                  <span style={{ fontWeight: '600', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {folderName}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', opacity: 0.4, flexShrink: 0 }}>{childFileCount}</span>
                                </div>

                                {/* Children — indented with a subtle vertical guide line */}
                                {isExpanded && (
                                  <div style={{ position: 'relative' }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: `${16 + depth * 16}px`,
                                      top: 0, bottom: 0,
                                      width: '1px',
                                      background: 'rgba(255,255,255,0.08)'
                                    }} />
                                    <RenderNode node={node[folderName]} path={[...path, folderName]} depth={depth + 1} />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Files at this level */}
                          {files.map(({ file, idx, shortName }) => (
                            <FileRow key={idx} file={file} idx={idx} label={shortName} depth={depth} />
                          ))}
                        </div>
                      );
                    }

                    function countFiles(node) {
                      if (!node) return 0;
                      let n = (node.__files || []).length;
                      Object.keys(node).filter(k => k !== '__files').forEach(k => { n += countFiles(node[k]); });
                      return n;
                    }

                    return <RenderNode node={tree} />;
                  })()}
                </div>

                {/* Code Editor Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {formFiles[activeFileIdx] ? (
                    <>
                      {/* Tab bar */}
                      <div style={{ padding: '6px 12px 0', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
                        {formFiles.map((file, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveFileIdx(idx)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px 6px 0 0',
                              border: '1px solid var(--card-border)',
                              borderBottom: activeFileIdx === idx ? '1px solid transparent' : '1px solid var(--card-border)',
                              background: activeFileIdx === idx ? 'var(--card-bg)' : 'transparent',
                              color: activeFileIdx === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                              marginBottom: activeFileIdx === idx ? '-1px' : '0'
                            }}
                          >
                            {file.name.split('/').pop()}
                          </button>
                        ))}
                      </div>

                      {/* File path breadcrumb */}
                      <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--card-border)' }}>
                        📁 {formFiles[activeFileIdx].name}
                      </div>

                      {/* Code textarea */}
                      <textarea
                        value={formFiles[activeFileIdx].content}
                        onChange={e => {
                          const updated = [...formFiles];
                          updated[activeFileIdx] = { ...updated[activeFileIdx], content: e.target.value };
                          setFormFiles(updated);
                        }}
                        style={{
                          flex: 1,
                          width: '100%',
                          minHeight: '340px',
                          padding: '12px 16px',
                          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                          fontSize: '0.82rem',
                          lineHeight: '1.6',
                          resize: 'none',
                          border: 'none',
                          outline: 'none',
                          background: 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          tabSize: 2
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const val = e.target.value;
                            const updated = [...formFiles];
                            updated[activeFileIdx] = { ...updated[activeFileIdx], content: val.substring(0, start) + '  ' + val.substring(end) };
                            setFormFiles(updated);
                            setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
                          }
                        }}
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                      />
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                      Select or create a file to start editing
                    </div>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Tip: Use paths like <code>html/popup.html</code>, <code>js/utils.js</code>, <code>assets/icon.svg</code> to create subfolders. Press <kbd>Tab</kbd> for indentation.
              </p>
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
