import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import { MessageSquarePlus } from 'lucide-react';

const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-purple-500'];

const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};

const UserList = ({ users, onSelectUser, selectedUserUid, chatRooms, loading }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const userColors = useRef({});

  const getOrCreateColor = (uid) => {
    if (!userColors.current[uid]) {
      userColors.current[uid] = getRandomColor();
    }
    return userColors.current[uid];
  };

  const filteredUsers = useMemo(() => {
    const usersWithChatInfo = users.filter(u => u.uid && u.uid !== user.uid && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(u => ({
        ...u,
        chatRoom: chatRooms.find(cr => cr.otherUserId === u.uid)
      }));

    return usersWithChatInfo.sort((a, b) => {
      const timestampA = a.chatRoom?.lastMessage?.timestamp ? a.chatRoom.lastMessage.timestamp.getTime() : 0;
      const timestampB = b.chatRoom?.lastMessage?.timestamp ? b.chatRoom.lastMessage.timestamp.getTime() : 0;
      return timestampB - timestampA;
    });
  }, [users, user.uid, searchQuery, chatRooms]);

  return (
    <div className="flex flex-col w-96 border-r bg-gray-100">
      <div className="p-4 flex justify-between items-center bg-gray-200">
        <Avatar avatar={{ type: user.profilePhotoUrl ? 'image' : 'initials', value: user.profilePhotoUrl || user.name.charAt(0), color: getOrCreateColor(user.uid) }} size="sm" />
        <div className="flex items-center">
          <MessageSquarePlus className="h-6 w-6 text-gray-600 cursor-pointer" />
        </div>
      </div>
      <div className="p-2 bg-gray-100">
        <input
          type="text"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 text-sm bg-white border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-gray-500">Loading users...</p>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
            return (
              <div key={u.uid} onClick={() => onSelectUser(u.uid)} 
                className={`p-3 flex items-center cursor-pointer hover:bg-gray-200 ${selectedUserUid === u.uid ? 'bg-gray-300' : ''}`}>
                <Avatar avatar={{ type: u.profilePhotoUrl ? 'image' : 'initials', value: u.profilePhotoUrl || u.name.charAt(0), color: getOrCreateColor(u.uid) }} size="md" />
                <div className="flex-1 ml-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">{u.name}</h3>
                    {u.chatRoom?.lastMessage?.timestamp &&
                      <p className="text-xs text-gray-500">{new Date(u.chatRoom.lastMessage.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    }
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-600 truncate">{u.chatRoom?.lastMessage?.text || ''}</p>
                    {u.chatRoom?.unreadCount > 0 &&
                      <span className="bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {u.chatRoom.unreadCount}
                      </span>
                    }
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <p className="p-4 text-gray-500">No users found.</p>
        )}
      </div>
    </div>
  );
};

export default UserList;
