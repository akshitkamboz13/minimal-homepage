import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

// Helper to run security checks on widget code
function validateWidgetSecurity(jsCode, htmlCode, files = []) {
  const issues = [];
  
  const checkCode = (code, type) => {
    if (!code) return;
    const lower = code.toLowerCase();
    if (lower.includes('chrome.')) {
      issues.push(`Forbidden access to Chrome Extension APIs ('chrome.*') detected in ${type}.`);
    }
    if (lower.includes('parent.') || lower.includes('window.parent')) {
      issues.push(`Forbidden attempts to access parent DOM context ('parent') detected in ${type}.`);
    }
    if (lower.includes('top.') || lower.includes('window.top')) {
      issues.push(`Forbidden attempts to access top DOM context ('top') detected in ${type}.`);
    }
    if (lower.includes('eval(')) {
      issues.push(`Dynamic script execution using 'eval()' is forbidden in ${type}.`);
    }
    if (type.endsWith('.html') || type === 'HTML') {
      if (lower.includes('<script')) {
        issues.push(`Dynamic script tags '<script>' are forbidden inside HTML code (${type}).`);
      }
    }
  };

  checkCode(jsCode, 'main.js');
  checkCode(htmlCode, 'index.html');

  if (Array.isArray(files)) {
    files.forEach(file => {
      const ext = (file.name || '').split('.').pop().toLowerCase();
      if (['js', 'mjs', 'cjs', 'html', 'htm'].includes(ext)) {
        checkCode(file.content, file.name);
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export async function POST(request) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    let filesList = Array.isArray(data.files) ? data.files : [];
    
    // Auto-extract manifest.json from files if present
    let manifestData = {};
    const manifestFile = filesList.find(f => (f.name || '').toLowerCase() === 'manifest.json');
    if (manifestFile && manifestFile.content) {
      try {
        manifestData = JSON.parse(manifestFile.content);
      } catch (err) {}
    } else if (data.manifest) {
      try {
        manifestData = typeof data.manifest === 'object' ? data.manifest : JSON.parse(data.manifest);
      } catch (err) {}
    }

    // Merge payload data with extracted manifest data
    const name = data.name || manifestData.name;
    const identifier = data.identifier || manifestData.identifier;
    const description = data.description || manifestData.description;
    const longDescription = data.longDescription || manifestData.longDescription;
    const version = data.version || manifestData.version || '1.0.0';
    const entryPoint = data.entryPoint || manifestData.entryPoint || 'index.html';
    const category = data.category || manifestData.category;
    const env = data.env || manifestData.env || '';
    const permissions = data.permissions || manifestData.permissions || [];
    const cli = (data.cli || manifestData.cli || '').toLowerCase().trim();
    const isFirefoxApp = !!(data.isFirefoxApp || manifestData.isFirefoxApp);
    const badges = Array.isArray(data.badges) ? data.badges : (Array.isArray(manifestData.badges) ? manifestData.badges : []);

    const {
      html,
      css,
      js,
      tags,
      screenshots,
      openSource,
      repositoryUrl,
    } = data;

    // Build files array if empty but html/css/js passed
    if (filesList.length === 0) {
      if (html) filesList.push({ name: 'index.html', content: html });
      if (css) filesList.push({ name: 'style.css', content: css });
      if (js) filesList.push({ name: 'app.js', content: js });
      if (manifestData && Object.keys(manifestData).length > 0) {
        filesList.push({ name: 'manifest.json', content: JSON.stringify(manifestData, null, 2) });
      }
    }

    // 1. Mandatory manifest validation
    if (!name || !identifier || !description || !version || !category) {
      return NextResponse.json(
        { error: 'Name, identifier, description, version, and category are required fields (provided in form or manifest.json).' },
        { status: 400 }
      );
    }

    // 2. Validate category
    const validCategories = [
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
      'Customization',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category selected.' }, { status: 400 });
    }

    // 3. Security checks
    const securityCheck = validateWidgetSecurity(js, html, filesList);
    if (!securityCheck.valid) {
      return NextResponse.json(
        { error: 'Security verification failed.', issues: securityCheck.issues },
        { status: 400 }
      );
    }

    // 4. Force screenshot (Must have at least one mockup/screenshot)
    const screenshotsList = Array.isArray(screenshots) ? screenshots.filter(Boolean) : [];
    if (screenshotsList.length === 0) {
      return NextResponse.json(
        { error: 'At least one screenshot/mockup URL must be provided.' },
        { status: 400 }
      );
    }

    // 5. Enforce tag limits (5 to 10 meaningful tags)
    const tagsList = Array.isArray(tags)
      ? tags
          .map(t => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    // 6. Check if identifier is already taken
    const existingWidget = await Widget.findOne({ identifier: identifier.toLowerCase().trim() });
    if (existingWidget) {
      return NextResponse.json(
        { error: `A widget with identifier '${identifier}' already exists.` },
        { status: 400 }
      );
    }

    // 7. Enforce CLI Command Uniqueness
    if (cli) {
      const existingCli = await Widget.findOne({ cli: cli });
      if (existingCli) {
        return NextResponse.json(
          { error: `CLI command alias '${cli}' is already registered by widget '${existingCli.name}'. Please choose a unique CLI command alias.` },
          { status: 400 }
        );
      }
    }

    // Create the widget listing
    const widget = await Widget.create({
      name: name.trim(),
      identifier: identifier.toLowerCase().trim(),
      description: description.trim(),
      longDescription: longDescription ? longDescription.trim() : '',
      version: version.trim(),
      entryPoint: entryPoint || 'index.html',
      html: html || '',
      css: css || '',
      js: js || '',
      env: env || '',
      cli: cli || '',
      files: filesList,
      isFirefoxApp: isFirefoxApp,
      badges: badges,
      permissions: Array.isArray(permissions) ? permissions : [],
      category,
      tags: tagsList,
      screenshots: screenshotsList,
      openSource: !!openSource,
      repositoryUrl: openSource ? (repositoryUrl || '').trim() : '',
      author: session.userId,
      status: 'approved', // Auto-approved
      changelog: [{ version: version.trim(), changes: ['Initial release'], date: new Date() }],
    });

    // Automatically update the user to have a 'developer' role if they were just a 'user'
    await User.findByIdAndUpdate(session.userId, { role: 'developer' });

    return NextResponse.json(
      { message: 'Widget published successfully!', widget },
      { status: 201 }
    );
  } catch (error) {
    console.error('Publish widget error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
