import { useState, useEffect, useCallback } from 'react';
import { sendMessage, getMessages, getChatRooms, markAsRead, updateMessage, deleteMessage } from '../../services/ChatService';
import { useToast } from '../useToast'; // <--- New import

const MESSAGES_PER_PAGE = 20;

export const useChatManagement = (chatRoomId, currentUserUid) => {
  const { addToast } = useToast(); // <--- New line
  const [messages, setMessages] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loadingChatRooms, setLoadingChatRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [lastVisibleMessageDoc, setLastVisibleMessageDoc] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  useEffect(() => {
    if (!currentUserUid) return;
    setLoadingChatRooms(true);
    const unsubscribe = getChatRooms(currentUserUid, (rooms) => {
      setChatRooms(rooms);
      setLoadingChatRooms(false);
    });
    return () => unsubscribe();
  }, [currentUserUid]);

  useEffect(() => {
    if (!chatRoomId) return;
    setLoadingMessages(true);
    setMessages([]); // Clear messages when chatRoomId changes
    setLastVisibleMessageDoc(null); // Reset pagination
    setHasMoreMessages(true);

    const unsubscribe = getMessages(
      chatRoomId,
      setMessages,
      MESSAGES_PER_PAGE,
      null,
      setLastVisibleMessageDoc,
      setHasMoreMessages,
      false, // append = false for initial load
      setLoadingMessages // <--- Pass setLoadingMessages
    );
    return () => unsubscribe();
  }, [chatRoomId, setMessages, setLastVisibleMessageDoc, setHasMoreMessages, setLoadingMessages]);

  const loadMoreMessages = useCallback(() => {
    if (!chatRoomId || !hasMoreMessages || !lastVisibleMessageDoc) return;
    setLoadingMessages(true);
    const unsubscribe = getMessages(
      chatRoomId,
      setMessages, // Pass setMessages directly
      MESSAGES_PER_PAGE,
      lastVisibleMessageDoc,
      setLastVisibleMessageDoc,
      setHasMoreMessages,
      true, // append = true
      setLoadingMessages // <--- Pass setLoadingMessages
    );
    return () => unsubscribe();
  }, [chatRoomId, hasMoreMessages, lastVisibleMessageDoc, setMessages, setLastVisibleMessageDoc, setHasMoreMessages, setLoadingMessages]);

  const handleSendMessage = async (message) => {
    if (!chatRoomId) return;
    try { // <--- New try block
      await sendMessage(chatRoomId, message, currentUserUid);
    } catch (error) { // <--- New catch block
      console.error('Failed to send message:', error);
      addToast({
        title: 'Error',
        message: 'Failed to send message. Please try again.',
        type: 'error',
      });
    }
  };

  const handleMarkAsRead = (chatRoomId) => {
    if (!chatRoomId || !currentUserUid) return;
    markAsRead(chatRoomId, currentUserUid);
  };

  const handleUpdateMessage = async (messageId, newText) => {
    if (!chatRoomId) return;
    await updateMessage(chatRoomId, messageId, newText);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!chatRoomId) return;
    await deleteMessage(chatRoomId, messageId);
  };

  return { messages, handleSendMessage, chatRooms, handleMarkAsRead, loadingChatRooms, loadingMessages, loadMoreMessages, hasMoreMessages, handleUpdateMessage, handleDeleteMessage };
};
