'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import logger from '@/utils/logger';

interface Friend {
  _id: string;
  name: string;
  email: string;
}

export default function FriendsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [potentialFriends, setPotentialFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch friends and users in parallel
        const [friendsResponse, usersResponse] = await Promise.all([
          fetch('/api/friends').then(res => {
            if (!res.ok) throw new Error('Failed to fetch friends');
            return res.json();
          }),
          fetch('/api/users').then(res => {
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
          })
        ]);

        setFriends(friendsResponse);
        // Filter out users who are already friends
        setPotentialFriends(usersResponse.filter((user: Friend) => 
          !friendsResponse.some((friend: Friend) => friend._id === user._id)
        ));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching friends data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleAddFriend = async (friendId: string) => {
    try {
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add friend');
      }

      // Refresh friends list
      const friendsResponse = await fetch('/api/friends');
      const friendsData = await friendsResponse.json();
      setFriends(friendsData);

      // Update potential friends list
      setPotentialFriends(prev => 
        prev.filter(user => user._id !== friendId)
      );
    } catch (error) {
      logger.error('Error adding friend', error);
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
        </div>

        {/* Current Friends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Friends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <FriendCard
                key={friend._id}
                friend={friend}
              />
            ))}
          </div>
        </div>

        {/* Add Friends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Friends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {potentialFriends.map((user) => (
              <PotentialFriendCard
                key={user._id}
                user={user}
                onAdd={() => handleAddFriend(user._id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function FriendCard({ friend }: { friend: Friend }) {
  const initials = friend?.name ? friend.name[0] : '?';

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
          {initials}
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{friend?.name || 'Unknown'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{friend?.email}</p>
        </div>
      </div>
    </div>
  );
}

function PotentialFriendCard({ user, onAdd }: { user: Friend; onAdd: () => void }) {
  const initials = user?.name ? user.name[0] : '?';

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
            {initials}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{user?.name || 'Unknown'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium px-3 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        >
          Add
        </button>
      </div>
    </div>
  );
} 