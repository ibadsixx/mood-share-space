import React, { useState } from 'react';
import { ChevronRight, Instagram, Facebook } from 'lucide-react';
import YourActivity from './YourActivity';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

type SubPage = 'main' | 'export' | 'access' | 'search' | 'activity' | 'connections' | 'contacts' | 'identity';

const YourInformationAndPermissions: React.FC = () => {
  const [subPage, setSubPage] = useState<SubPage>('main');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [exportTab, setExportTab] = useState('current');
  const { user } = useAuth();

  if (subPage === 'activity') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSubPage('main')}
          className="text-sm text-primary hover:underline"
        >
          ← Back
        </button>
        <YourActivity />
      </div>
    );
  }

  if (subPage !== 'main') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSubPage('main')}
          className="text-sm text-primary hover:underline"
        >
          ← Back
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Coming soon</p>
        </div>
      </div>
    );
  }

  const topItems = [
    { id: 'export' as SubPage, label: 'Download your data', isDialog: true },
    { id: 'access' as SubPage, label: 'View your data', isDialog: false },
    { id: 'search' as SubPage, label: 'Search history', isDialog: true },
  ];

  const handleTopItemClick = (item: typeof topItems[0]) => {
    if (item.isDialog && item.id === 'export') {
      setShowExportDialog(true);
    } else if (item.isDialog && item.id === 'search') {
      setShowSearchDialog(true);
    } else {
      setSubPage(item.id);
    }
  };

  const bottomItems = [
    { id: 'activity' as SubPage, label: 'Your activity outside Tone', icon: null },
    { id: 'connections' as SubPage, label: 'App connections', icon: null },
    { id: 'contacts' as SubPage, label: 'Manage contacts', icon: <Instagram className="w-4 h-4 text-muted-foreground" /> },
    { id: 'identity' as SubPage, label: 'Identity verification', icon: <Facebook className="w-4 h-4 text-muted-foreground" /> },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Export your information</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              You can save a copy of your information to a third-party service, or transfer it to your device. Accessible information covers content and details you've posted, your usage history, and data we gather.
            </DialogDescription>
          </DialogHeader>

          <Button className="w-full mt-2" size="lg">
            Generate export
          </Button>

          <Tabs value={exportTab} onValueChange={setExportTab} className="mt-2">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="current">Current activity</TabsTrigger>
              <TabsTrigger value="past">Past activity</TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-xs text-muted-foreground mt-2">
            Your export will not contain information that another person shared, like someone else's photos where you're mentioned.{' '}
            <span className="text-primary cursor-pointer hover:underline">Learn more</span>
          </p>
        </DialogContent>
      </Dialog>

      {/* Search History Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Lookup history</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              Browse and manage your lookup history across Tone. Only you can view what you've searched for.{' '}
              <span className="text-primary cursor-pointer hover:underline">
                Discover how we handle your data in our Privacy Policy.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <p className="text-sm font-semibold text-foreground mb-3">Your accounts &amp; profiles</p>
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-xs text-muted-foreground">Tone</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="mt-2">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors">
                <span className="text-sm font-medium text-foreground">Retain searches for</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Default</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>

          <Button className="w-full mt-3" size="lg">
            Erase all searches
          </Button>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <h2 className="text-2xl font-semibold text-foreground">Your information and permissions</h2>

      {/* Info banner */}
      <div className="rounded-xl bg-muted/60 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          To download or transfer a copy of your data, go to Download your data.
        </p>
      </div>

      {/* Top group */}
      <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
        {topItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTopItemClick(item)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Bottom group */}
      <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubPage(item.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.icon}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* Bottom group */}
      <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubPage(item.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/40 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.icon}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        Manage what data Tone can use to personalize your experience.
      </p>
    </div>
  );
};

export default YourInformationAndPermissions;
