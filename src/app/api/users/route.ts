import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('Fetching users', { currentUserId: session.user.id });
    await connectDB();

    // Get all users except the current user and exclude sensitive information
    const users = await User.find(
      { _id: { $ne: session.user.id } },
      { 
        password: 0, // Exclude password
        createdAt: 0,
        updatedAt: 0,
        __v: 0
      }
    ).lean();

    logger.info('Successfully fetched users', { count: users.length });
    return NextResponse.json(users);
  } catch (error) {
    logger.error('Error fetching users', error);
    return NextResponse.json(
      { message: 'Error fetching users' },
      { status: 500 }
    );
  }
} 