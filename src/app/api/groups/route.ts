import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Group } from '@/models/Group';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('Fetching groups for user', { userId: session.user.id });
    await connectDB();

    const groups = await Group.find({
      $or: [
        { ownerId: session.user.id },
        { members: session.user.id }
      ]
    })
    .populate('ownerId', 'name')
    .populate('members', 'name');

    logger.info('Successfully fetched groups', { count: groups.length });
    return NextResponse.json(groups);
  } catch (error) {
    logger.error('Error fetching groups', error);
    return NextResponse.json(
      { message: 'Error fetching groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, members } = body;

    if (!name) {
      return NextResponse.json(
        { message: 'Group name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const group = await Group.create({
      name,
      ownerId: session.user.id,
      members: [...new Set([...members, session.user.id])] // Include owner in members
    });

    await group.populate('ownerId members', 'name');

    logger.info('Group created successfully', { groupId: group._id });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    logger.error('Error creating group', error);
    return NextResponse.json(
      { message: 'Error creating group' },
      { status: 500 }
    );
  }
} 