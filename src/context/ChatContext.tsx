import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ChatContextValue {
  totalUnread: number;
  refresh: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const POLL_INTERVAL = 12000; // 12s

/**
 * Total de mensajes sin leer entre todas mis conversaciones (una por
 * solicitud con contrato firmado por ambas partes). Solo alimenta el badge
 * numerico de la pestana "Chat"; el sonido/banner de un mensaje nuevo ya lo
 * cubre NotificationsContext (el backend dispara NEW_MESSAGE al enviar).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const conversations: any[] = await api.get('/messaging/conversations');
      const total = (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setTotalUnread(total);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setTotalUnread(0);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  return <ChatContext.Provider value={{ totalUnread, refresh }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
