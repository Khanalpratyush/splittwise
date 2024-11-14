import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Expense } from '@/models/Expense';
import connectDB from '@/lib/mongodb';
import logger from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    logger.debug('Fetching expenses for user', { userId: session.user.id });
    await connectDB();

    // Find expenses where user is either the payer or involved in splits
    const expenses = await Expense.find({
      $or: [
        { payerId: session.user.id },
        { 'splits.userId': session.user.id }
      ]
    })
    .populate('payerId', 'name')
    .populate('groupId', 'name')
    .sort({ date: -1 });

    logger.info('Successfully fetched expenses', { count: expenses.length });
    return NextResponse.json(expenses);
  } catch (error) {
    logger.error('Error fetching expenses', error);
    return NextResponse.json(
      { message: 'Error fetching expenses' },
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
    const { description, amount, groupId, splits, type } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const expense = await Expense.create({
      description,
      amount,
      payerId: session.user.id,
      groupId: groupId || null,
      splits: type === 'split' ? splits : [],
      type,
      date: new Date()
    });

    await expense.populate('payerId groupId', 'name');

    logger.info('Expense created successfully', { 
      expenseId: expense._id,
      type,
      amount
    });
    
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    logger.error('Error creating expense', error);
    return NextResponse.json(
      { message: 'Error creating expense' },
      { status: 500 }
    );
  }
} 