import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import Widget from '@/models/Widget';
import { getSessionUser } from '@/lib/auth';

async function updateWidgetRatingStats(widgetId) {
  const reviews = await Review.find({ widget: widgetId });
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  await Widget.findByIdAndUpdate(widgetId, {
    averageRating: parseFloat(avg.toFixed(1)),
    ratingsCount: count,
  });
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const reviews = await Review.find({ widget: id })
      .populate('user', 'username role badges')
      .sort({ createdAt: -1 });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Fetch reviews error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { rating, comment } = await request.json();

    if (!rating || !comment) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Check if widget exists
    const widgetExists = await Widget.findById(id);
    if (!widgetExists) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Insert or update review
    const review = await Review.findOneAndUpdate(
      { widget: id, user: session.userId },
      { rating: ratingNum, comment: comment.trim() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update widget stats
    await updateWidgetRatingStats(id);

    return NextResponse.json({ message: 'Review saved successfully', review });
  } catch (error) {
    console.error('Save review error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
