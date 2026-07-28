import { ChatRoom, DirectMessage, Friend } from '../types';
import { StorageService } from './StorageService';
import { DeveloperService } from './DeveloperService';
import { D1DatabaseService } from './D1DatabaseService';
import { NotificationService } from './NotificationService';
import { canonicalDirectRoomId } from '../utils/identity';

const STORAGE_KEY_CHAT_ROOMS = 'chatRooms';
const STORAGE_KEY_MESSAGES = 'messages';

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
    return canonicalDirectRoomId('me', friendId);
  }

  public static getRooms(): ChatRoom[] {
    return StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
  }

  public static async getChatMessagesFromD1(friendId: string): Promise<DirectMessage[]> {
    const roomId = this.getRoomId(friendId);
    try {
      const messages = await D1DatabaseService.getChatMessages(roomId);
      if (messages && messages.length > 0) {
        const rooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
        let room = rooms.find((r) => r.roomId === roomId);
        if (room) {
          room.messages = messages;
          room.lastMessage = messages[messages.length - 1].text;
          room.lastMessageTime = messages[messages.length - 1].timestamp;
          StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, rooms);
        }
        return messages;
      }
    } catch (e) {
      console.warn('Error getting messages from D1:', e);
    }
    return this.getMessages(friendId);
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

  public static async sendMessage(
    friend: Friend,
    text: string,
    onReceiveReply?: (msg: DirectMessage) => void
  ): Promise<DirectMessage> {
    const rooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
    const roomId = this.getRoomId(friend.id);
    let room = rooms.find((r) => r.roomId === roomId) || rooms.find((r) => r.roomId === `room_me_${friend.id}` || r.roomId === `room_${friend.id}_me`);

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

    // Local Storage cache
    const roomIdx = rooms.findIndex((r) => r.roomId === roomId);
    if (roomIdx !== -1) {
      rooms[roomIdx] = room;
    } else {
      rooms.push(room);
    }
    StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, rooms);

    // Save to D1 Database
    try {
      await D1DatabaseService.sendChatMessage({
        id: userMsg.id,
        roomId,
        senderId: 'me',
        receiverId: friend.id,
        text,
        time: userMsg.time,
        timestamp: userMsg.timestamp,
      });
    } catch (e) {
      console.warn('Failed to send message to D1:', e);
    }

    // Trigger Typing & Auto Reply Simulation
    this.notifyTyping(friend.id, true, `${friend.username} sedang mengetik...`);

    setTimeout(async () => {
      this.notifyTyping(friend.id, false, '');

      const customReply = DeveloperService.matchAutoReply(text);
      const replyText =
        customReply ||
        [
          'Hallo! Terima kasih sudah menyapa.',
          'Hallo, Trainer! Semoga harimu menyenangkan!',
          'Iya! Ada apa, Trainer?',
          'Semangat terus ya!',
          'Nanti kita obrolin lagi pas selesai latihan 🏃‍♀️',
          'Oguri lagi bersiap buat balapan berikutnya!',
          'Jangan lupa makan wortel hari ini! 🥕',
        ][Math.floor(Math.random() * 7)];

      const replyMsg: DirectMessage = {
        id: `msg_${friend.id}_${Date.now()}`,
        senderId: friend.id,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      };

      const freshRooms = StorageService.getItem<ChatRoom[]>(STORAGE_KEY_CHAT_ROOMS, []);
      const fRoom = freshRooms.find((r) => r.roomId === roomId);
      if (fRoom) {
        fRoom.messages.push(replyMsg);
        fRoom.lastMessage = replyText;
        fRoom.lastMessageTime = Date.now();
        StorageService.setItem(STORAGE_KEY_CHAT_ROOMS, freshRooms);
      }

      // Save reply to D1
      try {
        await D1DatabaseService.sendChatMessage({
          id: replyMsg.id,
          roomId,
          senderId: friend.id,
          receiverId: 'me',
          text: replyText,
          time: replyMsg.time,
          timestamp: replyMsg.timestamp,
        });
      } catch (e) {
        console.warn('Failed to send reply to D1:', e);
      }

      // Trigger Browser Notification
      NotificationService.sendNotification(friend.username, replyText, {
        icon: friend.avatar,
        tag: `chat_${friend.id}`,
      });

      if (onReceiveReply) {
        onReceiveReply(replyMsg);
      }
    }, 1200);

    return userMsg;
  }
}
