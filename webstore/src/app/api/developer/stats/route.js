import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Widget from '@/models/Widget';
import Review from '@/models/Review';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. Fetch developer's widgets
    const widgets = await Widget.find({ author: session.userId });

    if (widgets.length === 0) {
      return NextResponse.json({
        hasWidgets: false,
        totalDownloads: 0,
        averageRating: 0,
        widgetsCount: 0,
        widgetsList: [],
        recentReviews: [],
      });
    }

    const widgetIds = widgets.map(w => w._id);

    // 2. Aggregate downloads and calculate totals
    let totalDownloads = 0;
    let sumRating = 0;
    let widgetsWithRatings = 0;

    widgets.forEach(w => {
      totalDownloads += w.downloadsCount;
      if (w.ratingsCount > 0) {
        sumRating += w.averageRating;
        widgetsWithRatings++;
      }
    });

    const averageRating = widgetsWithRatings > 0 ? parseFloat((sumRating / widgetsWithRatings).toFixed(1)) : 0;

    // 3. Fetch reviews for the developer's widgets
    const recentReviews = await Review.find({ widget: { $in: widgetIds } })
      .populate('user', 'username')
      .populate('widget', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // 4. Generate some mock/calculated weekly active user & adoption data
    const widgetsList = widgets.map(w => {
      // Mock adoption stats
      const weeklyActive = Math.round(w.downloadsCount * (0.6 + Math.random() * 0.3));
      return {
        id: w._id,
        name: w.name,
        identifier: w.identifier,
        version: w.version,
        downloads: w.downloadsCount,
        averageRating: w.averageRating,
        ratingsCount: w.ratingsCount,
        weeklyActive,
        adoption: {
          latest: Math.round(weeklyActive * 0.82),
          previous: Math.round(weeklyActive * 0.14),
          older: Math.round(weeklyActive * 0.04),
        },
      };
    });

    // 5. Calculate overall ratings distribution
    const allReviews = await Review.find({ widget: { $in: widgetIds } });
    const ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(r => {
      if (ratingsDistribution[r.rating] !== undefined) {
        ratingsDistribution[r.rating]++;
      }
    });

    // Mock weekly downloads history chart data
    const weeklyInstallsHistory = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      // Calculate a progressive slice of downloads
      const base = Math.round(totalDownloads / 15);
      const value = Math.max(5, Math.round(base * (0.8 + Math.random() * 0.5)));
      return { label, value };
    });

    return NextResponse.json({
      hasWidgets: true,
      totalDownloads,
      averageRating,
      widgetsCount: widgets.length,
      widgetsList,
      recentReviews,
      ratingsDistribution,
      weeklyInstallsHistory,
    });
  } catch (error) {
    console.error('Developer stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
