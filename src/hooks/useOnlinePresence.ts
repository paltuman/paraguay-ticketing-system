import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineUser {
  user_id: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const AWAY_THRESHOLD = 120000; // 2 minutes of inactivity
const OFFLINE_THRESHOLD = 60000; // Consider offline after 60s without heartbeat

export function useOnlinePresence(roomId?: string) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const updatePresence = useCallback(async () => {
    if (!user || !roomId) return;

    const channel = supabase.channel(`presence-${roomId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        const now = Date.now();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== user.id) {
              const lastSeen = new Date(presence.online_at).getTime();
              const timeDiff = now - lastSeen;
              
              // Only include users who are not offline
              if (timeDiff < OFFLINE_THRESHOLD) {
                users.push({
                  user_id: presence.user_id,
                  online_at: presence.online_at,
                  status: presence.status || 'online',
                  profile: presence.profile,
                });
              }
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
            status: 'online',
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
  const [currentStatus, setCurrentStatus] = useState<'online' | 'away' | 'busy'>('online');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (currentStatus === 'away') {
        setCurrentStatus('online');
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    // Check for away status
    const awayCheck = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > AWAY_THRESHOLD && currentStatus === 'online') {
        setCurrentStatus('away');
      }
    }, 30000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(awayCheck);
    };
  }, [currentStatus]);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        const now = Date.now();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            const lastSeen = new Date(presence.online_at).getTime();
            const timeDiff = now - lastSeen;
            
            // Only include users who have recent activity
            if (timeDiff < OFFLINE_THRESHOLD) {
              users.push({
                user_id: presence.user_id,
                online_at: presence.online_at,
                status: presence.status || 'online',
                profile: presence.profile,
              });
            }
          });
        });
        
        // Remove duplicates and sort by status
        const uniqueUsers = users.filter(
          (user, index, self) =>
            index === self.findIndex((u) => u.user_id === user.user_id)
        ).sort((a, b) => {
          const statusOrder = { online: 0, busy: 1, away: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
        
        setOnlineUsers(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handle new user joining
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Handle user leaving
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            status: currentStatus,
            profile: {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            },
          });
        }
      });

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(async () => {
      if (channelRef.current) {
        await channelRef.current.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: currentStatus,
          profile: {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
        });
      }
    }, HEARTBEAT_INTERVAL);

    // Handle page visibility
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        lastActivityRef.current = Date.now();
        setCurrentStatus('online');
        await channelRef.current.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status: 'online',
          profile: {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      channel.unsubscribe();
    };
  }, [user, profile, currentStatus]);

  const setStatus = useCallback(async (status: 'online' | 'away' | 'busy') => {
    setCurrentStatus(status);
    if (channelRef.current && user && profile) {
      await channelRef.current.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        status,
        profile: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      });
    }
  }, [user, profile]);

  return { onlineUsers, currentStatus, setStatus };
}
