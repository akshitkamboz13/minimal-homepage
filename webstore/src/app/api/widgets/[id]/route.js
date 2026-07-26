import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';
import { getSessionUser } from '@/lib/auth';

// Helper to run security checks on widget code
function validateWidgetSecurity(jsCode, htmlCode) {
  const issues = [];
  const lowercaseJs = (jsCode || '').toLowerCase();
  const lowercaseHtml = (htmlCode || '').toLowerCase();

  if (lowercaseJs.includes('chrome.')) {
    issues.push("Forbidden access to Chrome Extension APIs ('chrome.*') detected.");
  }
  if (lowercaseJs.includes('parent.') || lowercaseJs.includes('window.parent')) {
    issues.push("Forbidden attempts to access parent DOM context ('parent') detected.");
  }
  if (lowercaseJs.includes('top.') || lowercaseJs.includes('window.top')) {
    issues.push("Forbidden attempts to access top DOM context ('top') detected.");
  }
  if (lowercaseJs.includes('eval(')) {
    issues.push("Dynamic script execution using 'eval()' is forbidden for safety.");
  }
  if (lowercaseHtml.includes('<script')) {
    issues.push("Dynamic script tags '<script>' are forbidden inside the HTML code. Place logic in the JS code editor instead.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const widget = await Widget.findById(id).populate('author', 'username bio role badges');

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json(widget);
  } catch (error) {
    console.error('Fetch widget error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const widget = await Widget.findById(id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Author check
    if (widget.author.toString() !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. You are not the author.' }, { status: 403 });
    }

    const data = await request.json();
    const {
      name,
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
      changes, // list of items changed for version updates
    } = data;

    // Security validation on code modifications
    const securityCheck = validateWidgetSecurity(js || widget.js, html || widget.html);
    if (!securityCheck.valid) {
      return NextResponse.json(
        { error: 'Security validation failed.', issues: securityCheck.issues },
        { status: 400 }
      );
    }

    // Enforce tag limits
    const tagsList = Array.isArray(tags)
      ? tags
          .map(t => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10)
      : widget.tags;

    // Check version update logic
    if (version && version !== widget.version) {
      // Append changelog
      const changelogEntry = {
        version: version.trim(),
        changes: Array.isArray(changes) ? changes.filter(Boolean) : ['Update listing details'],
        date: new Date(),
      };
      widget.changelog.push(changelogEntry);
      widget.version = version.trim();
    }

    if (name) widget.name = name.trim();
    if (description) widget.description = description.trim();
    if (longDescription !== undefined) widget.longDescription = longDescription.trim();
    if (entryPoint) widget.entryPoint = entryPoint;
    if (html !== undefined) widget.html = html;
    if (css !== undefined) widget.css = css;
    if (js !== undefined) widget.js = js;
    if (env !== undefined) widget.env = env;
    if (permissions !== undefined) widget.permissions = permissions;
    if (category) widget.category = category;
    widget.tags = tagsList;
    if (screenshots !== undefined) {
      const s = screenshots.filter(Boolean);
      if (s.length > 0) widget.screenshots = s;
    }
    widget.openSource = !!openSource;
    widget.repositoryUrl = openSource ? (repositoryUrl || '').trim() : '';

    await widget.save();

    return NextResponse.json({ message: 'Widget updated successfully', widget });
  } catch (error) {
    console.error('Update widget error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const widget = await Widget.findById(id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Author check
    if (widget.author.toString() !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Widget.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Widget deleted successfully' });
  } catch (error) {
    console.error('Delete widget error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
