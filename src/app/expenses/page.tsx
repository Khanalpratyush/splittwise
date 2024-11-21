'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import { useModal } from '@/hooks/useModal';
import { Trash2, CheckCircle, Filter, SortDesc, Plus } from 'lucide-react';
import AddExpenseModal from '@/components/AddExpenseModal';
import EditExpenseModal from '@/components/EditExpenseModal';
import ExpenseDetailsModal from '@/components/ExpenseDetailsModal';
import logger from '@/utils/logger';
import type { Expense, Group, User, ExpenseLabelConfig } from '@/types';
import { EXPENSE_LABELS } from '@/types';

type ExpenseTab = 'created' | 'involved';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type TimeFilter = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

interface CustomDateRange {
  start: string;
  end: string;
}

export default function ExpensesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: session } = useSession();
  const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal(false);
  const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal(false);
  const { isOpen: isDetailsModalOpen, openModal: openDetailsModal, closeModal: closeDetailsModal } = useModal(false);
  
  const [activeTab, setActiveTab] = useState<ExpenseTab>('created');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    start: '',
    end: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLabels, setSelectedLabels] = useState<ExpenseLabel[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        logger.debug('Starting to fetch expenses data');

        const expensesResponse = await fetch('/api/expenses');
        const expensesData = await expensesResponse.json();

        if (!expensesResponse.ok) {
          throw new Error(expensesData.details || expensesData.message || 'Failed to fetch expenses');
        }

        logger.debug('Fetched expenses successfully', { count: expensesData.length });

        const friendsResponse = await fetch('/api/friends');
        const friendsData = await friendsResponse.json();

        if (!friendsResponse.ok) {
          throw new Error(friendsData.message || 'Failed to fetch friends');
        }

        const groupsResponse = await fetch('/api/groups');
        const groupsData = await groupsResponse.json();

        if (!groupsResponse.ok) {
          throw new Error(groupsData.message || 'Failed to fetch groups');
        }

        setExpenses(expensesData);
        setFriends(friendsData);
        setGroups(groupsData);

      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred';
        
        logger.error('Error fetching data', {
          error: error instanceof Error ? {
            message: error.message,
            name: error.name,
            stack: error.stack
          } : error
        });
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!session?.user?.id || !expenses.length) return;

    let filtered = [...expenses];

    if (selectedLabels.length > 0) {
      filtered = filtered.filter(expense => 
        selectedLabels.includes(expense.label)
      );
    }

    filtered = filtered.filter(expense => {
      const isCreator = expense.payerId._id === session?.user.id;
      const isParticipant = expense.splits.some(
        split => split.userId && split.userId._id === session?.user.id
      );

      if (activeTab === 'created') {
        return isCreator;
      } else {
        return !isCreator && isParticipant;
      }
    });

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(expense => expense.groupId?._id === selectedGroup);
    }

    filtered = filtered.filter(expense => {
      const expenseDate = new Date(expense.date);
      const now = new Date();
      
      switch (timeFilter) {
        case 'this-month':
          return expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        
        case 'last-month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return expenseDate.getMonth() === lastMonth.getMonth() && 
                 expenseDate.getFullYear() === lastMonth.getFullYear();
        
        case 'this-year':
          return expenseDate.getFullYear() === now.getFullYear();
        
        case 'custom':
          if (!customDateRange.start || !customDateRange.end) return true;
          const start = new Date(customDateRange.start);
          const end = new Date(customDateRange.end);
          return expenseDate >= start && expenseDate <= end;
        
        default:
          return true;
      }
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredExpenses(filtered);
  }, [activeTab, expenses, session?.user?.id, selectedGroup, timeFilter, sortBy, customDateRange, selectedLabels]);

  const getTotalAmount = (tab: ExpenseTab): number => {
    if (!session?.user?.id || !expenses.length) return 0;

    return expenses.reduce((total, expense) => {
      if (tab === 'created' && expense.payerId._id === session?.user.id) {
        return total + expense.amount;
      } else if (tab === 'involved' && expense.payerId._id !== session?.user.id) {
        const userSplit = expense.splits.find(
          split => split.userId._id === session?.user.id
        );
        return total + (userSplit?.amount || 0);
      }
      return total;
    }, 0);
  };

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

  const handleEditExpense = (expense: Expense) => {
    if (expense.payerId._id === session?.user.id) {
      setSelectedExpense(expense);
      openEditModal();
    } else {
      logger.warn('Only the creator can edit this expense');
    }
  };

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    openDetailsModal();
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
            <p className="font-medium">Error loading expenses</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Header and Add Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add New Expense
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('created')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'created'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
              >
                <span>Created by You</span>
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs">
                  ${getTotalAmount('created').toFixed(2)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('involved')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'involved'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
              >
                <span>Created by Others</span>
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs">
                  ${getTotalAmount('involved').toFixed(2)}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="all">All Groups</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {timeFilter === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                />
              </div>
            )}

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {activeTab === 'created' 
                  ? "You haven't created any expenses yet"
                  : "No expenses shared with you"}
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <ExpenseItem
                  key={expense._id}
                  expense={expense}
                  session={session}
                  onEdit={() => {
                    setSelectedExpense(expense);
                    openEditModal();
                  }}
                  onViewDetails={() => {
                    setSelectedExpense(expense);
                    openDetailsModal();
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Modals */}
        {isAddModalOpen && (
          <AddExpenseModal
            isOpen={isAddModalOpen}
            onClose={closeAddModal}
            friends={friends}
            groups={groups}
            onExpenseAdded={handleExpenseAdded}
          />
        )}

        {isEditModalOpen && selectedExpense && (
          <EditExpenseModal
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            expense={selectedExpense}
            friends={friends}
            groups={groups}
            onExpenseUpdated={handleExpenseAdded}
          />
        )}

        {isDetailsModalOpen && selectedExpense && (
          <ExpenseDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={closeDetailsModal}
            expense={selectedExpense}
            friends={friends}
          />
        )}
      </main>
    </div>
  );
}

function ExpenseItem({ 
  expense, 
  session, 
  onEdit,
  onViewDetails
}: { 
  expense: Expense;
  session: any;
  onEdit: () => void;
  onViewDetails: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isCreator = expense.payerId._id === session?.user.id;
  const userSplit = expense.splits.find(split => split.userId._id === session?.user.id);
  const isSettled = userSplit?.settled || false;

  // Calculate the amount for display
  const displayAmount = isCreator 
    ? expense.amount 
    : userSplit?.amount || 0;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/expenses/${expense._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      // Refresh the expenses list
      window.location.reload();
    } catch (error) {
      setError('Failed to delete expense');
      logger.error('Error deleting expense', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSettleUp = async () => {
    if (!confirm('Are you sure you want to mark this expense as settled?')) return;

    setIsSettling(true);
    setError(null);

    try {
      const response = await fetch('/api/expenses/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to settle expense');
      }

      // Refresh the expenses list
      window.location.reload();
    } catch (error) {
      setError('Failed to settle expense');
      logger.error('Error settling expense', error);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      {error && (
        <div className="mb-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{expense.description}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {expense.payerId.name} paid • {new Date(expense.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-medium text-gray-900 dark:text-white">
            {isCreator ? (
              `$${expense.amount.toFixed(2)}`
            ) : (
              `You owe $${displayAmount.toFixed(2)}`
            )}
          </span>
          {!isCreator && isSettled && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Settled
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {expense.groupId?.name || 'Personal'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isCreator ? 'You paid' : `${expense.payerId.name} paid $${expense.amount.toFixed(2)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isCreator ? (
            <>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button 
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                onClick={onEdit}
              >
                Edit
              </button>
            </>
          ) : (
            !isSettled && (
              <button 
                onClick={handleSettleUp}
                disabled={isSettling}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                {isSettling ? 'Settling...' : 'Settle Up'}
              </button>
            )
          )}
          <button 
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            onClick={onViewDetails}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
} 