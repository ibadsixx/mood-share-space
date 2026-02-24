import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { MiniChatWindow } from './MiniChatWindow';
import { supabase } from '@/integrations/supabase/client';

interface ChatContact {
  id: string;
  username: string;
  display_name: string;
  profile_pic?: string | null;
}

interface OpenChat {
  user: ChatContact;
  minimized: boolean;
}

export const FloatingIM: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [contactsCollapsed, setContactsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.id;

  // Fetch friends/contacts
  useEffect(() => {
    if (!currentUserId) return;

    const fetchContacts = async () => {
      try {
        const { data: friendsData, error } = await supabase
          .from('friends')
          .select('requester_id, receiver_id')
          .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .eq('status', 'accepted');

        if (error) throw error;

        if (!friendsData?.length) {
          setContacts([]);
          setLoading(false);
          return;
        }

        const friendIds = friendsData.map((f) =>
          f.requester_id === currentUserId ? f.receiver_id : f.requester_id
        );

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, profile_pic')
          .in('id', friendIds);

        if (profilesError) throw profilesError;

        setContacts(profiles || []);
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUserId]);

  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (contact: ChatContact) => {
    setOpenChats((prev) => {
      const existing = prev.find((c) => c.user.id === contact.id);
      if (existing) {
        // Un-minimize if already open
        return prev.map((c) =>
          c.user.id === contact.id ? { ...c, minimized: false } : c
        );
      }
      // Max 3 open chats
      const updated = [...prev, { user: contact, minimized: false }];
      if (updated.length > 3) updated.shift();
      return updated;
    });
  };

  const closeChat = (userId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.user.id !== userId));
  };

  const toggleMinimize = (userId: string) => {
    setOpenChats((prev) =>
      prev.map((c) =>
        c.user.id === userId ? { ...c, minimized: !c.minimized } : c
      )
    );
  };

  if (!currentUserId) return null;

  // Calculate positions for mini chat windows (open from right side)
  const openWindows = openChats.filter((c) => !c.minimized);
  const minimizedChats = openChats.filter((c) => c.minimized);

  return (
    <>
      {/* Mini Chat Windows - positioned above the contacts bar */}
      <div className="fixed bottom-0 right-[280px] z-50 flex items-end gap-2" style={{ direction: 'rtl' }}>
        {openChats.map((chat) => (
          <div key={chat.user.id} style={{ direction: 'ltr' }}>
            <MiniChatWindow
              user={chat.user}
              currentUserId={currentUserId}
              onClose={() => closeChat(chat.user.id)}
              onMinimize={() => toggleMinimize(chat.user.id)}
              isMinimized={chat.minimized}
            />
          </div>
        ))}
      </div>

      {/* Contacts Sidebar - right edge */}
      <aside className="fixed right-0 top-16 bottom-0 w-[260px] bg-card/95 backdrop-blur-sm border-l border-border/50 z-40 hidden xl:flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Contacts</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setContactsCollapsed(!contactsCollapsed)}
            >
              {contactsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <Input
            placeholder="Search contacts"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Contact List */}
        {!contactsCollapsed && (
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-0.5 pb-4">
              {loading ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => openChat(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors text-left group"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={contact.profile_pic || ''} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {contact.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator – shown randomly for demo, would use presence in production */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate group-hover:text-foreground">
                      {contact.display_name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        {/* New Message Button */}
        <div className="p-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-primary hover:bg-primary/10"
            onClick={() => window.location.href = '/messages'}
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm">Open Messenger</span>
          </Button>
        </div>
      </aside>
    </>
  );
};
