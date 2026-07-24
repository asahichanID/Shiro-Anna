import { ChatRoom, DirectMessage, Friend } from '../types';
import { StorageService } from './StorageService';
import { DeveloperService } from './DeveloperService';

const STORAGE_KEY_CHAT_ROOMS = 'chatRooms';
const STORAGE_KEY_MESSAGES = 'messages';

const DEFAULT_REPLIES = [
  'Hallo! Terima kasih sudah menyapa.',
  'Hallo, Trainer! Semoga harimu menyenangkan!',
  'Iya! Ada apa, Trainer?',
  'Semangat terus ya!',
  'Nanti kita obrolin lagi pas selesai latihan 🏃‍♀️',
  'Oguri lagi bersiap buat balapan berikutnya!',
  'Jangan lupa makan wortel hari ini! 🥕'
];

export interface TypingCallbackStatus {
  friendId: string;
  isTyping: boolean;
  text: string;
}

export class ChatService {
  private static typingListeners: ((status: TypingCallbackStatus) => void)[] = [];

  public static onTyping(listener: (status: TypingCallbackStatus) => void) {
    this.typingListeners.push(listener);
    return () => {
      this.typingListeners = this.typingListeners.filter((fn) => fn !== listener);
    };
  }

  private static notifyTyping(friendId: string, isTyping: boolean, text: string) {
    this.typingListeners.forEach((fn) => fn({ friendId, isTyping, text }));
  }

  public static getRoomId(friendId: string): string {
    return `room_me_${friendId}`;
  }

  public static getRooms(): ChatRoom[] {
    return StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
  }

  public static getChatRoom(friendId: string): ChatRoom {
    const rooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
    const roomId = this.getRoomId(friendId);
    let room = rooms.find((r) => r.roomId === roomId);

    if (!room) {
      room = {
        roomId,
        members: ['me', friendId],
        messages: [
          {
            id: `msg_init_${Date.now()}`,
            senderId: friendId,
            text: 'Hallo! Salam kenal!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
          },
        ],
        lastMessage: 'Hallo! Salam kenal!',
        lastMessageTime: Date.now(),
      };
      rooms.push(room);
      StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, rooms);
    }

    return room;
  }

  public static getMessages(friendId: string): DirectMessage[] {
    const room = this.getChatRoom(friendId);
    return room.messages || [];
  }

  public static sendMessage(
    friend: Friend,
    text: string,
    onReceiveReply?: (msg: DirectMessage) => void
  ): DirectMessage {
    const rooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
    const roomId = this.getRoomId(friend.id);
    let room = rooms.find((r) => r.roomId === roomId);

    if (!room) {
      room = this.getChatRoom(friend.id);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: DirectMessage = {
      id: `msg_me_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      senderId: 'me',
      text,
      time: timeStr,
      timestamp: Date.now(),
    };

    room.messages.push(userMsg);
    room.lastMessage = text;
    room.lastMessageTime = Date.now();

    // Update room in storage
    const roomIdx = rooms.findIndex((r) => r.roomId === roomId);
    if (roomIdx !== -1) {
      rooms[roomIdx] = room;
    } else {
      rooms.push(room);
    }
    StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, rooms);

    // Save globally to messages array too as requested
    const allMessages = StorageService.getItem<DirectMessage[]>(STORAGE_KEY_MESSAGES, []);
    allMessages.push(userMsg);
    StorageService.setItem(STORAGE_KEY_MESSAGES, allMessages);

    // Update Friend's lastMessage in friends list if exists
    const friends = StorageService.getItem<any[]>('friends', []);
    const fIdx = friends.findIndex((f) => f.id === friend.id);
    if (fIdx !== -1) {
      friends[fIdx].lastMessage = text;
      StorageService.setItem('friends', friends);
    }

    // Trigger Typing & Auto Reply Simulation after ~1 sec
    this.notifyTyping(friend.id, true, `${friend.username} sedang mengetik...`);

    setTimeout(() => {
      this.notifyTyping(friend.id, false, '');

      // Determine response
      const customReply = DeveloperService.matchAutoReply(text);
      const replyText = customReply || DEFAULT_REPLIES[Math.floor(Math.random() * DEFAULT_REPLIES.length)];

      const replyMsg: DirectMessage = {
        id: `msg_${friend.id}_${Date.now()}`,
        senderId: friend.id,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      };

      // Reload fresh rooms & add reply
      const freshRooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
      const fRoom = freshRooms.find((r) => r.roomId === roomId);
      if (fRoom) {
        fRoom.messages.push(replyMsg);
        fRoom.lastMessage = replyText;
        fRoom.lastMessageTime = Date.now();
        StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, freshRooms);
      }

      // Save to global messages
      const globalMsgs = StorageService.getItem<DirectMessage[]>(STORAGE_KEY_MESSAGES, []);
      globalMsgs.push(replyMsg);
      StorageService.setItem(STORAGE_KEY_MESSAGES, globalMsgs);

      // Update friend's lastMessage
      const freshFriends = StorageService.getItem<any[]>('friends', []);
      const ffIdx = freshFriends.findIndex((f) => f.id === friend.id);
      if (ffIdx !== -1) {
        freshFriends[ffIdx].lastMessage = replyText;
        StorageService.setItem('friends', freshFriends);
      }

      if (onReceiveReply) {
        onReceiveReply(replyMsg);
      }
    }, 1200);

    return userMsg;
  }
}
