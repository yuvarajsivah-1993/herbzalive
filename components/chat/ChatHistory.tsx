import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import { Search, MoreVertical, Send, Smile, Paperclip, CheckCheck } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-purple-500'];

const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};

const ChatHistory = ({ messages, user, onSendMessage, selectedUser, loading, loadMoreMessages, hasMoreMessages, handleUpdateMessage, handleDeleteMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatHistoryRef = useRef(null);
  const userColors = useRef({});
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  // console.log('ChatHistory messages array:', messages); // Removed log

  const getOrCreateColor = (uid) => {
    if (!userColors.current[uid]) {
      userColors.current[uid] = getRandomColor();
    }
    return userColors.current[uid];
  };

  useEffect(() => {
    const chatHistoryElement = chatHistoryRef.current;
    if (!chatHistoryElement) return;

    const handleScroll = () => {
      if (chatHistoryElement.scrollTop === 0 && hasMoreMessages && !loading) {
        loadMoreMessages();
      }
    };

    chatHistoryElement.addEventListener('scroll', handleScroll);

    // Clean up the event listener
    return () => {
      chatHistoryElement.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreMessages, loading, loadMoreMessages]);

  // This useEffect is for auto-scrolling to bottom when new messages arrive
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    if (editingMessageId) {
      handleUpdateMessage(editingMessageId, newMessage);
      setEditingMessageId(null);
    } else {
      onSendMessage({ text: newMessage, user: { id: user.uid, name: user.name } });
    }
    setNewMessage('');
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    if (message.user.id === user.uid && !message.deleted) {
      setContextMenu({ x: e.clientX, y: e.clientY, message });
    }
  };

  const handleEdit = () => {
    setNewMessage(contextMenu.message.text);
    setEditingMessageId(contextMenu.message.id);
    setContextMenu(null);
  };

  const confirmDelete = (message) => {
    setMessageToDelete(message);
    setIsDeleteModalOpen(true);
    setContextMenu(null);
  };

  const executeDelete = () => {
    if (messageToDelete) {
      handleDeleteMessage(messageToDelete.id);
      setMessageToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const renderStatus = () => {
    if (!selectedUser) return null;
    if (selectedUser.status === 'online') {
      return <p className="text-xs text-green-500">online</p>;
    } else if (selectedUser.status === 'offline' && selectedUser.lastOnline) {
      return <p className="text-xs text-gray-600">Last seen {formatDistanceToNowStrict(selectedUser.lastOnline.toDate(), { addSuffix: true })}</p>;
    } else {
      return <p className="text-xs text-gray-600">offline</p>;
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-gray-200">
      <div className="p-3 flex justify-between items-center bg-gray-300 border-b">
        <div className="flex items-center">
          <Avatar avatar={{ type: selectedUser.profilePhotoUrl ? 'image' : 'initials', value: selectedUser.profilePhotoUrl || selectedUser.name.charAt(0), color: getOrCreateColor(selectedUser.uid) }} size="sm" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold">{selectedUser.name}</h3>
            {renderStatus()}
          </div>
        </div>
        <div className="flex items-center">
          <Search className="h-6 w-6 text-gray-600 mr-4 cursor-pointer" />
          <MoreVertical className="h-6 w-6 text-gray-600 cursor-pointer" />
        </div>
      </div>
      <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-4 bg-cover bg-center" style={{ backgroundImage: `url('https://i.redd.it/qwd83nc4xxf41.jpg')`}}>
        {loading && messages.length === 0 ? (
          <p className="p-4 text-gray-500">Loading messages...</p>
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className={`flex mb-2 ${message.user.id === user.uid ? 'justify-end' : ''}`}>
              <div 
                className={`rounded-lg p-2 max-w-md relative ${message.user.id === user.uid ? 'bg-green-200' : 'bg-white'}`}
                onContextMenu={(e) => handleContextMenu(e, message)}
              >
                {message.deleted ? (
                  <p className="text-sm italic text-gray-500">This message was deleted.</p>
                ) : (
                  <p className="text-sm">{message.text}</p>
                )}
                <div className="flex justify-end items-center mt-1">
                  {message.edited && <span className="text-xs text-gray-500 mr-1">Edited</span>}
                  <p className="text-xs text-gray-500 mr-1">{message.timestamp && message.timestamp.toDate ? new Date(message.timestamp.toDate()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Sending...'}</p>
                  {message.user.id === user.uid && <CheckCheck className="h-4 w-4 text-blue-500" />}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No messages yet.</p>
        )}
      </div>
      <div className="p-3 bg-gray-300">
        <div className="flex items-center">
          <Smile className="h-6 w-6 text-gray-600 cursor-pointer" />
          <Paperclip className="h-6 w-6 text-gray-600 ml-2 cursor-pointer" />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="flex-1 mx-2 px-4 py-2 text-sm bg-white border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
          />
          <button onClick={handleSubmit} className="bg-green-500 text-white rounded-full h-10 w-10 flex items-center justify-center">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {contextMenu && (
        <div
          className="absolute bg-white shadow-md rounded-lg py-1 z-10"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button 
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleEdit}
          >
            Edit
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
            onClick={() => confirmDelete(contextMenu.message)}
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
      />
    </div>
  );
};

export default ChatHistory;
