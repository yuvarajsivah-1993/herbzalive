import React, { useState, useMemo } from 'react';
import { useChatManagement } from '../hooks/management/useChatManagement';
import { useAuth } from '../hooks/useAuth';
import { getChatRoomId } from '../services/ChatService';
import UserList from '../components/chat/UserList';
import ChatHistory from '../components/chat/ChatHistory';
import { MessageSquarePlus, Search, MoreVertical, Send, Smile, Paperclip, CheckCheck } from 'lucide-react';

const ChatScreen = () => {
  const { user, usersForHospital } = useAuth();
  const [selectedUserUid, setSelectedUserUid] = useState(null);

  const chatRoomId = useMemo(() => {
    if (!user || !selectedUserUid) return null;
    return getChatRoomId(user.uid, selectedUserUid);
  }, [user, selectedUserUid]);

  const { messages, handleSendMessage, chatRooms, handleMarkAsRead, loadingChatRooms, loadingMessages, loadMoreMessages, hasMoreMessages, handleUpdateMessage, handleDeleteMessage } = useChatManagement(chatRoomId, user?.uid);

  const handleSelectUser = (uid) => {
    setSelectedUserUid(uid);
    if (user && uid) {
      const newChatRoomId = getChatRoomId(user.uid, uid);
      handleMarkAsRead(newChatRoomId);
    }
  };

  const selectedUser = useMemo(() => {
    if (!selectedUserUid) return null;
    return usersForHospital.find(u => u.uid === selectedUserUid);
  }, [selectedUserUid, usersForHospital]);

  return (
    <div className="flex h-full">
      <UserList users={usersForHospital} onSelectUser={handleSelectUser} selectedUserUid={selectedUserUid} chatRooms={chatRooms} loading={loadingChatRooms} />
      {selectedUser ? (
        <ChatHistory 
          messages={messages} 
          user={user} 
          onSendMessage={handleSendMessage} 
          selectedUser={selectedUser} 
          loading={loadingMessages} 
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          handleUpdateMessage={handleUpdateMessage}
          handleDeleteMessage={handleDeleteMessage}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <MessageSquarePlus className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Select a conversation</h2>
            <p className="mt-1 text-sm text-gray-500">Choose from an existing conversation or start a new one.</p>
          </div>
        </div>
      )}
    </div>
  );
};


export default ChatScreen;
