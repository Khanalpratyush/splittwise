import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';
import mongoose from 'mongoose';
import { Activity } from '@/models/Activity';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      logger.warn('Unauthorized access attempt to expenses API');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const label = searchParams.get('label');

    await connectDB();
    logger.debug('Database connection successful');

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const query = {
      $or: [
        { payerId: userId },
        { 'splits.userId': userId }
      ],
      ...(label && { label })
    };

    const expenses = await Expense.find(query)
      .populate('payerId', 'name email')
      .populate('groupId', 'name')
      .populate('splits.userId', 'name email')
      .sort({ date: -1 })
      .lean();

    logger.info('Successfully fetched expenses', { 
      count: expenses.length,
      userId: userId.toString()
    });

    return NextResponse.json(expenses);

  } catch (error) {
    logger.error('Failed to fetch expenses', error);
    return NextResponse.json(
      { message: 'Failed to fetch expenses' },
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
    const { description, amount, groupId, splits, type, image } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const expense = await Expense.create({
      description,
      amount,
      payerId: userId,
      groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
      splits: splits.map((split: any) => ({
        userId: new mongoose.Types.ObjectId(split.userId),
        amount: split.amount,
        settled: false
      })),
      type,
      image,
      date: new Date()
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('payerId', 'name email')
      .populate('groupId', 'name')
      .populate('splits.userId', 'name email')
      .lean();

    logger.info('Expense created successfully', { 
      expenseId: expense._id,
      type,
      amount,
      splits: splits.length
    });
    
    const activity = new Activity({
      type: 'expense_created',
      expense: expense._id,
      actorId: session.user.id,
      actorName: session.user.name,
    });
    await activity.save();

    return NextResponse.json(populatedExpense);
  } catch (error) {
    logger.error('Error creating expense', error);
    return NextResponse.json(
      { message: 'Error creating expense' },
      { status: 500 }
    );
  }
} 