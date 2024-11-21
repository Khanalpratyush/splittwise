'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import logger from '@/utils/logger';
import type { User, Group, Split, ExpenseType, ExpenseCategory } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  groups: Group[];
  onExpenseAdded?: () => void;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎮' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'health', label: 'Health', icon: '⚕️' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'other', label: 'Other', icon: '📌' }
];

type SplitType = 'equal' | 'exact' | 'percentage';

export default function AddExpenseModal({ 
  isOpen, 
  onClose, 
  friends, 
  groups,
  onExpenseAdded 
}: AddExpenseModalProps) {
  const { data: session } = useSession();
  const [expenseType, setExpenseType] = useState<ExpenseType>('split');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<Split[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setAmount('');
      setSelectedGroupId('');
      setSelectedFriends([]);
      setSplitType('equal');
      setSplits([]);
      setError(null);
    }
  }, [isOpen]);

  // Update splits when friends are selected or amount changes
  useEffect(() => {
    if (amount && selectedFriends.length > 0) {
      calculateSplits();
    }
  }, [amount, selectedFriends, splitType]);

  // Handle group selection
  useEffect(() => {
    if (selectedGroupId) {
      const selectedGroup = groups.find(g => g._id === selectedGroupId);
      if (selectedGroup) {
        // Get member IDs excluding current user
        const memberIds = selectedGroup.members
          .filter(member => member._id !== session?.user.id)
          .map(member => member._id);
        setSelectedFriends(memberIds);
      }
    }
  }, [selectedGroupId, groups, session?.user.id]);

  const calculateSplits = () => {
    const totalAmount = parseFloat(amount) || 0;
    const numPeople = selectedFriends.length + 1; // +1 for current user

    if (splitType === 'equal') {
      const equalAmount = Math.round((totalAmount / numPeople) * 100) / 100;
      const newSplits = selectedFriends.map(friendId => ({
        userId: friendId,
        amount: equalAmount,
        settled: false
      }));
      setSplits(newSplits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    if (expenseType === 'split' && selectedFriends.length === 0) {
      setError('Please select at least one friend to split with');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          category: expenseType === 'solo' ? category : undefined,
          groupId: selectedGroupId || undefined,
          splits: expenseType === 'split' ? splits : [],
          type: expenseType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      onExpenseAdded?.();
      onClose();
    } catch (error) {
      logger.error('Error creating expense', error);
      setError('Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Expense</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="What's this expense for?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Expense Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="solo"
                    checked={expenseType === 'solo'}
                    onChange={(e) => {
                      setExpenseType('solo');
                      setSelectedFriends([]);
                      setSelectedGroupId('');
                    }}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 dark:text-white">Personal Expense</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="split"
                    checked={expenseType === 'split'}
                    onChange={(e) => setExpenseType('split')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 dark:text-white">Split with Others</span>
                </label>
              </div>
            </div>

            {/* Split Options */}
            {expenseType === 'split' && (
              <>
                {/* Group Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Group (Optional)
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group._id} value={group._id}>{group.name}</option>
                    ))}
                  </select>
                </div>

                {/* Friend Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Split with
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <label 
                        key={friend._id} 
                        className="flex items-center p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriends([...selectedFriends, friend._id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(id => id !== friend._id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <span className="block font-medium text-gray-900 dark:text-white">{friend.name}</span>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">{friend.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Split Preview */}
                {selectedFriends.length > 0 && amount && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                          You
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">Your share</span>
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        ${(Math.round((parseFloat(amount) / (selectedFriends.length + 1)) * 100) / 100).toFixed(2)}
                      </span>
                    </div>

                    {selectedFriends.map((friendId) => {
                      const friend = friends.find(f => f._id === friendId);
                      if (!friend) return null;

                      const split = splits.find(s => s.userId === friendId);
                      const friendInitial = friend.name ? friend.name[0] : '?';
                      
                      return (
                        <div key={friendId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                              {friendInitial}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {friend.name || 'Unknown'}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(split?.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Category Selection for Personal Expenses */}
            {expenseType === 'solo' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {EXPENSE_CATEGORIES.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      className={`
                        flex items-center gap-2 p-3 rounded-lg border transition-colors duration-200
                        ${category === value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 