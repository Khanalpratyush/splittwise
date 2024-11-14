'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AddExpenseModal from '@/components/AddExpenseModal';
import { useModal } from '@/hooks/useModal';
import logger from '@/utils/logger';

interface Friend {
  _id: string;
  name: string;
  email: string;
}

interface Group {
  _id: string;
  name: string;
}

interface Expense {
  _id: string;
  description: string;
  amount: number;
  date: string;
  payerId: {
    _id: string;
    name: string;
  };
  groupId?: {
    _id: string;
    name: string;
  };
  splits: Array<{
    userId: string;
    amount: number;
  }>;
}

export default function ExpensesPage() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const { isOpen, openModal, closeModal } = useModal(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [expensesRes, friendsRes, groupsRes] = await Promise.all([
          fetch('/api/expenses').then(res => {
            if (!res.ok) throw new Error('Failed to fetch expenses');
            return res.json();
          }),
          fetch('/api/friends').then(res => {
            if (!res.ok) throw new Error('Failed to fetch friends');
            return res.json();
          }),
          fetch('/api/groups').then(res => {
            if (!res.ok) throw new Error('Failed to fetch groups');
            return res.json();
          })
        ]);

        setExpenses(expensesRes);
        setFriends(friendsRes);
        setGroups(groupsRes);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleExpenseAdded = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      logger.error('Error refreshing expenses', error);
    }
  };

  if (isLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <button 
            onClick={openModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Add New Expense
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-4 flex-wrap">
            <select className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700">
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700">
              <option>All Time</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Custom Range</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {expenses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No expenses found
              </div>
            ) : (
              expenses.map((expense) => (
                <ExpenseItem
                  key={expense._id}
                  description={expense.description}
                  amount={expense.amount}
                  date={expense.date}
                  paidBy={expense.payerId.name}
                  group={expense.groupId?.name || 'Personal'}
                  isOwn={expense.payerId._id === session?.user.id}
                />
              ))
            )}
          </div>
        </div>

        {isOpen && (
          <AddExpenseModal
            isOpen={isOpen}
            onClose={closeModal}
            friends={friends}
            groups={groups}
            onExpenseAdded={handleExpenseAdded}
          />
        )}
      </main>
    </div>
  );
}

function ExpenseItem({ 
  description, 
  amount, 
  date, 
  paidBy, 
  group, 
  isOwn 
}: { 
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  group: string;
  isOwn: boolean;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{description}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {paidBy} paid • {new Date(date).toLocaleDateString()}
          </p>
        </div>
        <span className="font-medium text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{group}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isOwn ? 'You' : 'Someone else'}
          </span>
        </div>
        <button className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
          View Details
        </button>
      </div>
    </div>
  );
} 