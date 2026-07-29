import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all approved widgets that have a registered CLI command alias
    const widgets = await Widget.find({ status: 'approved' })
      .select('name identifier cli description category isVerified isFirefoxApp version')
      .lean();

    const cliDataset = widgets
      .filter(w => w.cli && w.cli.trim() !== '')
      .map(w => ({
        cli: w.cli,
        name: w.name,
        identifier: w.identifier,
        description: w.description,
        category: w.category,
        isVerified: !!w.isVerified,
        isFirefoxApp: !!w.isFirefoxApp,
        version: w.version,
      }));

    return NextResponse.json({
      count: cliDataset.length,
      commands: cliDataset,
    });
  } catch (error) {
    console.error('CLI Dataset fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
