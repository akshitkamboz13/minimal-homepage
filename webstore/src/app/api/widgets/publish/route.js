import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

// Helper to run security checks on widget code
function validateWidgetSecurity(jsCode, htmlCode) {
  const issues = [];
  const lowercaseJs = (jsCode || '').toLowerCase();
  const lowercaseHtml = (htmlCode || '').toLowerCase();

  // Banned Chrome extension APIs
  if (lowercaseJs.includes('chrome.')) {
    issues.push("Forbidden access to Chrome Extension APIs ('chrome.*') detected.");
  }

  // Parent/top window access checks
  if (lowercaseJs.includes('parent.') || lowercaseJs.includes('window.parent')) {
    issues.push("Forbidden attempts to access parent DOM context ('parent') detected.");
  }
  if (lowercaseJs.includes('top.') || lowercaseJs.includes('window.top')) {
    issues.push("Forbidden attempts to access top DOM context ('top') detected.");
  }

  // Dynamic code injection checks
  if (lowercaseJs.includes('eval(')) {
    issues.push("Dynamic script execution using 'eval()' is forbidden for safety.");
  }

  // HTML dynamic script tags checks
  if (lowercaseHtml.includes('<script')) {
    issues.push("Dynamic script tags '<script>' are forbidden inside the HTML code. Place logic in the JS code editor instead.");
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

    const {
      name,
      identifier,
      description,
      longDescription,
      version,
      entryPoint,
      html,
      css,
      js,
      env,
      permissions,
      category,
      tags,
      screenshots,
      openSource,
      repositoryUrl,
    } = data;

    // 1. Mandatory manifest validation
    if (!name || !identifier || !description || !version || !category) {
      return NextResponse.json(
        { error: 'Name, identifier, description, version, and category are required fields.' },
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
    const securityCheck = validateWidgetSecurity(js, html);
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

    // Check if identifier is already taken
    const existingWidget = await Widget.findOne({ identifier: identifier.toLowerCase().trim() });
    if (existingWidget) {
      return NextResponse.json(
        { error: `A widget with identifier '${identifier}' already exists.` },
        { status: 400 }
      );
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
