import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';
import User from '@/models/User';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'downloads'; // downloads, rating, new, updated
    const limit = parseInt(searchParams.get('limit')) || 20;

    const filter = { status: 'approved' };

    // Apply category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Apply text search filter
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ];
    }

    let sortOptions = {};
    if (sortBy === 'downloads') {
      sortOptions = { downloadsCount: -1 };
    } else if (sortBy === 'rating') {
      sortOptions = { averageRating: -1, ratingsCount: -1 };
    } else if (sortBy === 'new') {
      sortOptions = { createdAt: -1 };
    } else if (sortBy === 'updated') {
      sortOptions = { updatedAt: -1 };
    } else {
      sortOptions = { downloadsCount: -1 };
    }

    const widgets = await Widget.find(filter)
      .populate('author', 'username badges')
      .sort(sortOptions)
      .limit(limit);

    return NextResponse.json(widgets);
  } catch (error) {
    console.error('Fetch widgets error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
