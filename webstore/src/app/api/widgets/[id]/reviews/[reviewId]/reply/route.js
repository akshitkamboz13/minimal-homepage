import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/Review';
import Widget from '@/models/Widget';
import { getSessionUser } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const { id, reviewId } = resolvedParams;

    // 1. Verify widget exists and current user is the author
    const widget = await Widget.findById(id);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    if (widget.author.toString() !== session.userId && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only the widget author can reply to reviews.' },
        { status: 403 }
      );
    }

    // 2. Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const { comment } = await request.json();
    if (!comment) {
      return NextResponse.json({ error: 'Reply comment is required' }, { status: 400 });
    }

    // 3. Set developer response
    review.developerResponse = {
      comment: comment.trim(),
      createdAt: new Date(),
    };

    await review.save();

    return NextResponse.json({ message: 'Response saved successfully', review });
  } catch (error) {
    console.error('Save reply error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
