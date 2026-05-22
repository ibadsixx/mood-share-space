import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePageSwitch } from '@/contexts/PageSwitchContext';
import { supabase } from '@/integrations/supabase/client';
import { openChatWindow } from './ChatWindowManager';

interface ChatContact {
  id: string;
  username: string;
  display_name: string;
  profile_pic?: string | null;
}

export const FloatingIM: React.FC = () => {
  const { user } = useAuth();
  const { actingPage } = usePageSwitch();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsCollapsed, setContactsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.id;

  // Fetch contacts — personal or page-specific
  useEffect(() => {
    if (!currentUserId) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        if (actingPage) {
          // Fetch page contacts — people the page has conversed with
          const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .eq('page_id', actingPage.id)
            .order('updated_at', { ascending: false });
          if (!convs || convs.length === 0) {
            setContacts([]);
            setLoading(false);
            return;
          }
          const convIds = convs.map((c: any) => c.id);
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .in('conversation_id', convIds);
          if (!participants || participants.length === 0) {
            setContacts([]);
            setLoading(false);
            return;
          }
          const userIds = [...new Set<string>(participants.map((p: any) => p.user_id).filter((uid: string) => uid !== currentUserId))];
          if (userIds.length === 0) {
            setContacts([]);
            setLoading(false);
            return;
          }
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, profile_pic')
            .in('id', userIds);
          setContacts(profiles || []);
        } else {
          // Fetch personal contacts — friends + conversation partners
          const [friendsRes, convsRes] = await Promise.all([
            supabase
              .from('friends')
              .select('requester_id, receiver_id')
              .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
              .eq('status', 'accepted'),
            supabase
              .from('conversation_participants')
              .select('conversation_id, user_id')
              .neq('user_id', currentUserId)
          ]);

          const userIdSet = new Set<string>();

          friendsRes.data?.forEach((f) => {
            userIdSet.add(f.requester_id === currentUserId ? f.receiver_id : f.requester_id);
          });

          if (convsRes.data?.length) {
            const { data: myConvs } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .eq('user_id', currentUserId);

            const myConvIds = new Set(myConvs?.map(c => c.conversation_id) || []);
            convsRes.data.forEach((cp) => {
              if (myConvIds.has(cp.conversation_id)) {
                userIdSet.add(cp.user_id);
              }
            });
          }

          const allIds = Array.from(userIdSet);
          if (!allIds.length) {
            setContacts([]);
            setLoading(false);
            return;
          }

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, profile_pic')
            .in('id', allIds);

          setContacts(profiles || []);
        }
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUserId, actingPage]);

  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (contact: ChatContact) => {
    openChatWindow(contact);
  };

  if (!currentUserId) return null;

  return (
    <>
      {/* Contacts Sidebar - right edge */}
      <aside className="fixed right-0 top-16 bottom-0 w-[260px] bg-card/95 backdrop-blur-sm border-l border-border/50 z-40 hidden xl:flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{actingPage ? 'Page Contacts' : 'Contacts'}</h3>
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
