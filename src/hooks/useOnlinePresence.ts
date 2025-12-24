import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  user_id: string;
  online_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useOnlinePresence(roomId?: string) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const updatePresence = useCallback(async () => {
    if (!user || !roomId) return;

    const channel = supabase.channel(`presence-${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== user.id) {
              users.push({
                user_id: presence.user_id,
                online_at: presence.online_at,
                profile: presence.profile,
              });
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user && profile) {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            profile: {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile, roomId]);

  useEffect(() => {
    if (roomId && user) {
      const cleanup = updatePresence();
      return () => {
        cleanup?.then((fn) => fn?.());
      };
    }
  }, [roomId, user, updatePresence]);

  return { onlineUsers };
}

export function useGlobalPresence() {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('global-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push({
              user_id: presence.user_id,
              online_at: presence.online_at,
              profile: presence.profile,
            });
          });
        });
        
        // Remove duplicates
        const uniqueUsers = users.filter(
          (user, index, self) =>
            index === self.findIndex((u) => u.user_id === user.user_id)
        );
        
        setOnlineUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            profile: {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
          });
        }
      });

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(async () => {
      await channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        profile: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      channel.unsubscribe();
    };
  }, [user, profile]);

  return { onlineUsers };
}
