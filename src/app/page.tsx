'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import logger from '@/utils/logger';

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

interface Friend {
  _id: string;
  name: string;
}

interface Group {
  _id: string;
  name: string;
  members: Array<{ _id: string; name: string }>;
}

interface Balance {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
}

export default function Home() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [balances, setBalances] = useState<Balance>({
    totalBalance: 0,
    youOwe: 0,
    youAreOwed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [expensesRes, groupsRes, friendsRes] = await Promise.all([
          fetch('/api/expenses').then(res => {
            if (!res.ok) throw new Error('Failed to fetch expenses');
            return res.json();
          }),
          fetch('/api/groups').then(res => {
            if (!res.ok) throw new Error('Failed to fetch groups');
            return res.json();
          }),
          fetch('/api/friends').then(res => {
            if (!res.ok) throw new Error('Failed to fetch friends');
            return res.json();
          })
        ]);

        setExpenses(expensesRes);
        setGroups(groupsRes);
        setFriends(friendsRes);

        // Calculate balances
        let totalOwed = 0;
        let totalOwe = 0;

        expensesRes.forEach((expense: Expense) => {
          if (expense.payerId._id === session?.user.id) {
            // You paid, others owe you
            const totalSplits = expense.splits.reduce((sum, split) => sum + split.amount, 0);
            totalOwed += totalSplits;
          } else {
            // Someone else paid, you might owe them
            const yourSplit = expense.splits.find(split => split.userId === session?.user.id);
            if (yourSplit) {
              totalOwe += yourSplit.amount;
            }
          }
        });

        setBalances({
          youAreOwed: totalOwed,
          youOwe: totalOwe,
          totalBalance: totalOwed - totalOwe
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching dashboard data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && session?.user.id) {
      fetchData();
    }
  }, [isAuthenticated, session?.user.id]);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Cards */}
          <div className="col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard
                title="Total Balance"
                amount={balances.totalBalance}
                type={balances.totalBalance >= 0 ? 'positive' : 'negative'}
              />
              <SummaryCard
                title="You Owe"
                amount={balances.youOwe}
                type="negative"
              />
              <SummaryCard
                title="You are Owed"
                amount={balances.youAreOwed}
                type="positive"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                <Link href="/expenses" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {expenses.slice(0, 5).map((expense) => (
                  <ActivityItem
                    key={expense._id}
                    description={expense.description}
                    amount={expense.amount}
                    date={expense.date}
                    paidBy={expense.payerId.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Groups and Friends */}
          <div className="space-y-6">
            {/* Groups Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Groups</h2>
                <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {groups.slice(0, 3).map((group) => (
                  <GroupItem
                    key={group._id}
                    name={group.name}
                    members={group.members.length}
                  />
                ))}
              </div>
            </div>

            {/* Friends Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Friends</h2>
                <Link href="/friends" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {friends.slice(0, 3).map((friend) => {
                  // Calculate balance with this friend
                  let balance = 0;
                  expenses.forEach((expense) => {
                    if (expense.payerId._id === friend._id) {
                      // Friend paid, you might owe them
                      const yourSplit = expense.splits.find(split => split.userId === session?.user.id);
                      if (yourSplit) {
                        balance -= yourSplit.amount;
                      }
                    } else if (expense.payerId._id === session?.user.id) {
                      // You paid, they might owe you
                      const theirSplit = expense.splits.find(split => split.userId === friend._id);
                      if (theirSplit) {
                        balance += theirSplit.amount;
                      }
                    }
                  });

                  return (
                    <FriendItem
                      key={friend._id}
                      name={friend.name}
                      amount={balance}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ title, amount, type }: { title: string; amount: number; type: 'positive' | 'negative' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors duration-200">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className={`text-2xl font-semibold mt-2 ${
        type === 'positive' 
          ? 'text-emerald-600 dark:text-emerald-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        ${Math.abs(amount).toFixed(2)}
      </p>
    </div>
  );
}

function ActivityItem({ description, amount, date, paidBy }: { description: string; amount: number; date: string; paidBy: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b dark:border-gray-700 last:border-0">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{description}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{paidBy} paid • {new Date(date).toLocaleDateString()}</p>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">${amount.toFixed(2)}</span>
    </div>
  );
}

function GroupItem({ name, members }: { name: string; members: number }) {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
          {name[0]}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">{members} members</span>
    </div>
  );
}

function FriendItem({ name, amount }: { name: string; amount: number }) {
  const initials = name?.split(' ')
    .map(n => n[0])
    .join('') || '?';

  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
          {initials}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
      </div>
      <span className={`font-medium ${
        amount >= 0 
          ? 'text-emerald-600 dark:text-emerald-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        {amount >= 0 ? `+$${Math.abs(amount).toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`}
      </span>
    </div>
  );
}
