// src/screens/ChatScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTrackingStore } from '../store/useTrackingStore';
import { tcpSocketManager } from '../services/tcpSocketManager';

export function ChatScreen({ navigation }: any) {
  const [inputText, setInputText] = useState('');
  const messages = useTrackingStore((state) => state.messages);
  const addMessage = useTrackingStore((state) => state.addMessage);
  const role = useTrackingStore((state) => state.role);
  const flatListRef = useRef<FlatList>(null);

  // Fallback/Demo messages if list is empty
  const fallbackMessages = [
    { id: '1', senderId: '2', senderName: 'Sarah Mendis', text: 'Everyone ready to head out?', timestamp: Date.now() - 1000 * 60 * 5 },
    { id: '2', senderId: 'me', senderName: 'You', text: 'Yes! On my way to the meeting point.', timestamp: Date.now() - 1000 * 60 * 3 },
    { id: '3', senderId: '3', senderName: 'Mike Perera', text: "I'm at the entrance already", timestamp: Date.now() - 1000 * 60 * 1 },
  ];

  const displayMessages = messages.length > 0
    ? messages.map(msg => ({
        id: msg.id,
        senderName: msg.senderName,
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mine: msg.senderId === 'me',
      }))
    : fallbackMessages.map(msg => ({
        id: msg.id,
        senderName: msg.senderName,
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mine: msg.senderId === 'me',
      }));

  const handleSend = () => {
    if (!inputText.trim()) return;

    const payload = {
      senderId: 'me',
      senderName: 'You',
      text: inputText,
    };

    if (addMessage) {
      addMessage(payload);
    }

    // Attempt peer-to-peer transmission
    try {
      if (tcpSocketManager) {
        const payloadData = {
          type: 'CHAT',
          memberId: 'me',
          memberName: 'You',
          message: inputText,
          timestamp: Date.now(),
        };

        if (role === 'leader' && tcpSocketManager.broadcast) {
          tcpSocketManager.broadcast(payloadData);
        } else if (role === 'member' && tcpSocketManager.send) {
          tcpSocketManager.send(payloadData);
        }
      }
    } catch (e) {
      console.warn('TCP messaging transmit failed, continuing locally.', e);
    }

    setInputText('');
    
    // Auto-scroll to end after a tiny timeout
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Chat</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>P2P Link</Text>
          </View>
        </View>

        {/* Chat Threads */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.messageBubbleContainer, item.mine ? styles.mineContainer : styles.theirsContainer]}>
              {!item.mine && <Text style={styles.senderLabel}>{item.senderName}</Text>}
              <View style={[styles.bubble, item.mine ? styles.mineBubble : styles.theirsBubble]}>
                <Text style={[styles.msgText, item.mine ? styles.mineText : styles.theirsText]}>
                  {item.text}
                </Text>
                <Text style={[styles.timeText, item.mine ? styles.mineTime : styles.theirsTime]}>
                  {item.time}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type offline message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    paddingVertical: 8,
    marginRight: 16,
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
    backgroundColor: '#FAFAD2', // Cozy off-white chat page background
  },
  listContent: {
    padding: 20,
    paddingBottom: 24,
  },
  messageBubbleContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  mineContainer: {
    alignSelf: 'flex-end',
  },
  theirsContainer: {
    alignSelf: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
    fontWeight: '600',
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mineBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  theirsBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: '#ffffff',
  },
  theirsText: {
    color: '#1A1A1A',
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  mineTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirsTime: {
    color: '#888888',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#F9F9F9',
    color: '#1A1A1A',
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
