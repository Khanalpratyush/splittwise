'use client';

import { X } from 'lucide-react';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
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
    image?: string;
  };
  friends: Array<{ _id: string; name: string; }>;
}

export default function ExpenseDetailsModal({
  isOpen,
  onClose,
  expense,
  friends
}: ExpenseDetailsModalProps) {
  if (!isOpen) return null;

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.split(' ')
      .map(n => n?.[0] || '')
      .filter(Boolean)
      .join('') || '?';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Expense Details</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{expense.description}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(expense.date).toLocaleDateString()} • {expense.groupId?.name || 'Personal Expense'}
              </p>
            </div>

            <div className="flex justify-between items-center py-3 border-t dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                ${expense.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Receipt Image */}
          {expense.image && (
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Receipt</h3>
              </div>
              <div className="p-4">
                <img 
                  src={expense.image} 
                  alt="Receipt" 
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Split Details */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Split Details</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Paid By */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                    {getInitials(expense.payerId.name)}
                  </div>
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      {expense.payerId.name || 'Unknown'}
                    </span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">paid the bill</span>
                  </div>
                </div>
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  ${expense.amount.toFixed(2)}
                </span>
              </div>

              {/* Split List */}
              {expense.splits.map((split) => {
                const friend = friends.find(f => f._id === split.userId);
                if (!friend) return null;

                const initials = getInitials(friend.name);

                return (
                  <div key={split.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                        {initials}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {friend.name || 'Unknown'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${split.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 