import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, updateDoc, getDoc, where, getDocs, limit, startAfter, endBefore } from 'firebase/firestore';

export const getChatRoomId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

export const sendMessage = async (chatRoomId, message, currentUserUid) => {
  try {
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    const messagesCollectionRef = collection(chatRoomRef, 'messages');

    // Ensure chat room document exists
    await setDoc(chatRoomRef, { 
      createdAt: serverTimestamp(),
      participants: chatRoomId.split('_'),
    }, { merge: true });

    await addDoc(messagesCollectionRef, {
      ...message,
      timestamp: serverTimestamp(),
    });

    await updateDoc(chatRoomRef, {
      lastMessage: {
        text: message.text,
        timestamp: serverTimestamp(),
      },
      [`lastRead.${currentUserUid}`]: serverTimestamp(),
    });

  } catch (error) {
    console.error('Error sending message: ', error);
    throw error; // Re-throw the error
  }
};

export const getMessages = (chatRoomId, setMessages, messagesLimit, lastVisibleMessageDoc, setLastVisibleMessageDoc, setHasMoreMessages, append = false, setLoadingMessages) => {
  const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
  const messagesCollectionRef = collection(chatRoomRef, 'messages');

  // Fetch one extra document to check if there are more messages
  let q = query(messagesCollectionRef, orderBy('timestamp', 'desc'), limit(messagesLimit + 1));

  if (lastVisibleMessageDoc) {
    q = query(messagesCollectionRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleMessageDoc), limit(messagesLimit + 1));
  }

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const newMessages = [];
    const docs = querySnapshot.docs;

    // Determine if there are more messages
    const hasMore = docs.length > messagesLimit;

    // Only take the actual messagesLimit number of messages
    const actualMessages = hasMore ? docs.slice(0, messagesLimit) : docs;

    actualMessages.forEach((doc) => {
      newMessages.push({ id: doc.id, ...doc.data() });
    });

    setMessages(prevMsgs => {
      const updatedMessagesMap = new Map(prevMsgs.map(msg => [msg.id, msg])); // Start with existing messages
      newMessages.forEach(msg => {
        updatedMessagesMap.set(msg.id, msg); // Add/update with new messages
      });

      const combinedMessages = Array.from(updatedMessagesMap.values());

      // Sort the combined list. The order depends on whether we're appending or not.
      // For appending, we want to maintain the chronological order, so sort ascending.
      // For initial load/real-time, we also want ascending.
      return combinedMessages.sort((a, b) => {
        const timestampA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : Number.MAX_SAFE_INTEGER;
        const timestampB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : Number.MAX_SAFE_INTEGER;
        return timestampA - timestampB;
      });
    });
    setLastVisibleMessageDoc(actualMessages[actualMessages.length - 1]); // Set last visible doc from actual messages
    setHasMoreMessages(hasMore); // Use the new hasMore variable
    setLoadingMessages(false);
  });
  return unsubscribe;
};

export const getChatRooms = (currentUserUid, setChatRooms) => {
  const q = query(collection(db, 'chatRooms'));

  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const chatRooms = [];
    for (const doc of querySnapshot.docs) {
      try { // Added try-catch block
        const chatRoomData = doc.data();
        const chatRoomId = doc.id;
        const userIds = chatRoomId.split('_');
        if (userIds.includes(currentUserUid)) {
          const otherUserId = userIds.find(id => id !== currentUserUid);
          const messagesCollectionRef = collection(doc.ref, 'messages');
          const lastReadTimestamp = chatRoomData.lastRead?.[currentUserUid];
          const unreadQuery = query(
            messagesCollectionRef,
            where('timestamp', '>', lastReadTimestamp || new Date(0)),
            where('user.id', '!=', currentUserUid) // Exclude messages sent by the current user
          );
          const unreadSnapshot = await getDocs(unreadQuery);

                  let lastMessage = {
                    text: '',
                    timestamp: null, // Default to null for unresolved timestamp
                  };
                  if (chatRoomData.lastMessage) {
                    lastMessage = {
                      ...chatRoomData.lastMessage,
                      timestamp: chatRoomData.lastMessage.timestamp?.toDate ? chatRoomData.lastMessage.timestamp.toDate() : null,
                    };
                  }
          chatRooms.push({
            id: chatRoomId,
            otherUserId,
            ...chatRoomData,
            lastMessage,
            unreadCount: unreadSnapshot.size,
          });
        }
      } catch (error) {
        console.error(`Error processing chat room ${doc.id}: `, error);
      }
    }
    setChatRooms(chatRooms);
  });

  return unsubscribe;
};

export const markAsRead = async (chatRoomId, currentUserUid) => {
  try {
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    const chatRoomDoc = await getDoc(chatRoomRef); // <--- Get the document

    if (chatRoomDoc.exists()) { // <--- Check if it exists
      await updateDoc(chatRoomRef, {
        [`lastRead.${currentUserUid}`]: serverTimestamp(),
      });
    } else {
      console.warn(`Chat room document ${chatRoomId} does not exist. Cannot mark as read.`);
    }
  } catch (error) {
    console.error('Error marking as read: ', error);
  }
};

export const updateMessage = async (chatRoomId, messageId, newText) => {
  try {
    const messageRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    await updateDoc(messageRef, { text: newText, edited: true });
  } catch (error) {
    console.error('Error updating message: ', error);
  }
};

export const deleteMessage = async (chatRoomId, messageId) => {
  try {
    const messageRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    await updateDoc(messageRef, { text: 'This message was deleted.', deleted: true });
  } catch (error) {
    console.error('Error deleting message: ', error);
  }
};
