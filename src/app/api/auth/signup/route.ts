import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function POST(request: Request) {
  try {
    logger.info('Starting user signup process');
    
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      logger.warn('Missing required fields in signup', { email, name });
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.debug('Connecting to database for signup');
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.warn('Attempted to create duplicate user', { email });
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    logger.debug('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    logger.debug('Creating new user', { email, name });
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
    });

    logger.info('User created successfully', { userId: user._id });
    
    // Return success with redirect flag
    return NextResponse.json(
      { 
        message: 'User created successfully',
        redirect: true 
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error in signup process', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 