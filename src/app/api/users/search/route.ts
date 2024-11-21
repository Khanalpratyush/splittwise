import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    logger.debug('Searching user by email', { email });
    await connectDB();

    // Get current user's friends first
    const currentUser = await User.findById(session.user.id)
      .select('friends')
      .lean();

    const friendIds = currentUser?.friends || [];

    // Find user by exact email match, excluding current user and existing friends
    const user = await User.findOne({
      email: email,
      _id: { 
        $ne: session.user.id,
        $nin: friendIds
      }
    })
    .select('name email')
    .lean();

    if (!user) {
      return NextResponse.json(
        { message: 'User not found or already added as friend' },
        { status: 404 }
      );
    }

    logger.info('User found successfully');
    return NextResponse.json(user);
  } catch (error) {
    logger.error('Error searching user', error);
    return NextResponse.json(
      { message: 'Error searching user' },
      { status: 500 }
    );
  }
} 