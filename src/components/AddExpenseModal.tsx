'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

interface Split {
  userId: string;
  amount: number;
  percentage?: number;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  groups: Group[];
  onExpenseAdded?: () => void;
}

type SplitType = 'equal' | 'exact' | 'percentage';
type ExpenseType = 'solo' | 'split';

export default function AddExpenseModal({ 
  isOpen, 
  onClose, 
  friends, 
  groups,
  onExpenseAdded 
}: AddExpenseModalProps) {
  const [expenseType, setExpenseType] = useState<ExpenseType>('solo');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<Split[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (amount && selectedFriends.length > 0) {
      calculateSplits();
    }
  }, [amount, selectedFriends, splitType]);

  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setAmount('');
      setSelectedGroupId('');
      setSelectedFriends([]);
      setSplitType('equal');
      setSplits([]);
      setExpenseType('solo');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateSplits = () => {
    const totalAmount = parseFloat(amount) || 0;
    const numPeople = selectedFriends.length + 1; // +1 for current user

    if (splitType === 'equal') {
      // Calculate equal split with proper rounding
      const equalAmount = Math.round((totalAmount / numPeople) * 100) / 100;
      let remainingAmount = totalAmount;
      
      const newSplits = selectedFriends.map((friendId, index) => {
        // For the last person, use remaining amount to avoid rounding errors
        const splitAmount = index === selectedFriends.length - 1 
          ? remainingAmount 
          : equalAmount;
        
        remainingAmount -= equalAmount;

        return {
          userId: friendId,
          amount: splitAmount,
          percentage: Math.round((splitAmount / totalAmount) * 100)
        };
      });
      setSplits(newSplits);
    } else if (splitType === 'percentage') {
      // Initialize with equal percentages
      const equalPercentage = 100 / numPeople;
      const newSplits = selectedFriends.map(friendId => ({
        userId: friendId,
        amount: (totalAmount * equalPercentage) / 100,
        percentage: equalPercentage
      }));
      setSplits(newSplits);
    } else {
      // For exact amounts, initialize with 0
      const newSplits = selectedFriends.map(friendId => ({
        userId: friendId,
        amount: 0,
        percentage: 0
      }));
      setSplits(newSplits);
    }
  };

  const updateSplit = (userId: string, value: number, type: 'amount' | 'percentage') => {
    const totalAmount = parseFloat(amount) || 0;
    const newSplits = splits.map(split => {
      if (split.userId === userId) {
        if (type === 'amount') {
          // Round to 2 decimal places
          const roundedAmount = Math.round(value * 100) / 100;
          return {
            ...split,
            amount: roundedAmount,
            percentage: Math.round((roundedAmount / totalAmount) * 100)
          };
        } else {
          // For percentage splits
          const calculatedAmount = Math.round((totalAmount * value / 100) * 100) / 100;
          return {
            ...split,
            amount: calculatedAmount,
            percentage: value
          };
        }
      }
      return split;
    });
    setSplits(newSplits);
  };

  const validateSplits = (): boolean => {
    const totalAmount = parseFloat(amount) || 0;
    const splitSum = splits.reduce((sum, split) => sum + split.amount, 0);
    
    // Use a small epsilon value for floating point comparison
    const epsilon = 0.01;
    if (Math.abs(splitSum - totalAmount) > epsilon) {
      setError(`Split amounts must equal total amount (${totalAmount.toFixed(2)})`);
      return false;
    }

    if (splitType === 'percentage') {
      const percentageSum = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(percentageSum - 100) > epsilon) {
        setError('Percentages must add up to 100%');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseType === 'split' && !validateSplits()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          groupId: selectedGroupId || undefined,
          splits: expenseType === 'split' ? splits : [],
          type: expenseType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      logger.info('Expense created successfully');
      onExpenseAdded?.();
      onClose();
    } catch (error) {
      logger.error('Error creating expense', error);
      setError('Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <span className="text-red-500 mr-2">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Expense Type
              </label>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="expenseType"
                    value="solo"
                    checked={expenseType === 'solo'}
                    onChange={() => setExpenseType('solo')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 font-medium">Personal Expense</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="expenseType"
                    value="split"
                    checked={expenseType === 'split'}
                    onChange={() => setExpenseType('split')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-900 font-medium">Split with Others</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                  placeholder="What's this expense for?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-900">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Group (Optional)
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id} className="text-gray-900">
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {expenseType === 'split' && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="text-sm font-medium text-gray-900">Split Details</h3>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Split with
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {friends.map((friend) => (
                        <label key={friend._id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
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
                          <span className="ml-2 text-gray-900 font-medium">{friend.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedFriends.length > 0 && (
                    <>
                      <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                        {['equal', 'exact', 'percentage'].map((type) => (
                          <label key={type} className="flex items-center">
                            <input
                              type="radio"
                              name="splitType"
                              value={type}
                              checked={splitType === type}
                              onChange={() => setSplitType(type as SplitType)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                            />
                            <span className="ml-2 text-gray-900 font-medium capitalize">{type} Split</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                          <span className="font-medium text-gray-900">You</span>
                          <span className="text-emerald-700 font-medium">
                            ${(Math.round((parseFloat(amount) - splits.reduce((sum, split) => sum + split.amount, 0)) * 100) / 100).toFixed(2)}
                          </span>
                        </div>
                        {splits.map((split) => {
                          const friend = friends.find(f => f._id === split.userId);
                          return (
                            <div key={split.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-900 font-medium">{friend?.name}</span>
                              {splitType === 'equal' ? (
                                <span className="font-medium text-gray-900">${split.amount.toFixed(2)}</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={splitType === 'percentage' ? split.percentage : split.amount}
                                    onChange={(e) => updateSplit(
                                      split.userId,
                                      parseFloat(e.target.value) || 0,
                                      splitType === 'percentage' ? 'percentage' : 'amount'
                                    )}
                                    step={splitType === 'percentage' ? '1' : '0.01'}
                                    min="0"
                                    max={splitType === 'percentage' ? '100' : undefined}
                                    className="w-24 border rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                                  />
                                  <span className="text-gray-900 font-medium">
                                    {splitType === 'percentage' ? '%' : '$'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (expenseType === 'split' && selectedFriends.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
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