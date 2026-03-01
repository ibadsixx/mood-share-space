import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, Instagram, Facebook } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import YourActivity from './YourActivity';

type SubView = null | 'download' | 'view-data' | 'search-history' | 'activity-outside' | 'app-connections' | 'manage-contacts' | 'identity-verification';

const YourInformationAndPermissions: React.FC = () => {
  const [subView, setSubView] = useState<SubView>(null);

  const topItems = [
    { id: 'download' as SubView, label: 'Download your data' },
    { id: 'view-data' as SubView, label: 'View your data' },
    { id: 'search-history' as SubView, label: 'Search history' },
  ];

  const middleItems = [
    { id: 'activity-outside' as SubView, label: 'Your activity outside Tone', icon: null },
    { id: 'app-connections' as SubView, label: 'App connections', icon: null },
    { id: 'manage-contacts' as SubView, label: 'Manage contacts', rightIcon: Instagram },
    { id: 'identity-verification' as SubView, label: 'Identity verification', rightIcon: Facebook },
  ];

  const renderListItem = (item: { id: SubView; label: string; icon?: any; rightIcon?: any }) => (
    <button
      key={item.id}
      onClick={() => setSubView(item.id)}
      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-accent/50 transition-colors"
    >
      <span className="text-sm text-foreground">{item.label}</span>
      <div className="flex items-center gap-2">
        {item.rightIcon && <item.rightIcon className="w-4 h-4 text-muted-foreground" />}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );

  const renderSubViewContent = () => {
    switch (subView) {
      case 'download':
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              You can export a copy of your information to an external service, or export it to your device. Available information includes content and info you've shared, your activity and info we collect.
            </p>
            <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              Create export
            </button>
            <div className="border-b border-border">
              <div className="flex">
                <button className="flex-1 pb-2 text-sm font-semibold border-b-2 border-primary text-foreground">Current activity</button>
                <button className="flex-1 pb-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Past activity</button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your export won't include information that someone else shared, such as another person's photos you're tagged in. <span className="text-primary cursor-pointer hover:underline">Learn more</span>
            </p>
          </div>
        );
      case 'view-data':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">View the information associated with your Tone account.</p>
            <div className="space-y-2">
              {['Profile information', 'Posts & content', 'Messages', 'Activity log'].map(item => (
                <button key={item} className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <span className="text-sm">{item}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        );
      case 'search-history':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and manage your search history on Tone.</p>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No recent searches</p>
            </div>
          </div>
        );
      case 'activity-outside':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Manage what data Tone can use from your activity on other websites and apps to personalize your experience.</p>
          </div>
        );
      case 'app-connections':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Manage apps and websites connected to your Tone account.</p>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No connected apps</p>
            </div>
          </div>
        );
      case 'manage-contacts':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Control how Tone uses your contacts and manages your connections.</p>
          </div>
        );
      case 'identity-verification':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Verify your identity to access additional features on Tone.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getSubViewTitle = () => {
    const titles: Record<string, string> = {
      'download': 'Export your information',
      'view-data': 'View your data',
      'search-history': 'Search history',
      'activity-outside': 'Your activity outside Tone',
      'app-connections': 'App connections',
      'manage-contacts': 'Manage contacts',
      'identity-verification': 'Identity verification',
    };
    return subView ? titles[subView] : '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Your information and permissions</h2>
        <p className="text-sm text-muted-foreground">To download or transfer a copy of your data, go to Download your data.</p>
      </div>

      {/* Top group */}
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {topItems.map(renderListItem)}
      </div>

      {/* Middle group */}
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {middleItems.map(renderListItem)}
      </div>

      {/* Footer text */}
      <p className="text-xs text-muted-foreground">
        Manage what data Tone can use to personalize your experience.
      </p>

      {/* Sub-view dialog */}
      <Dialog open={subView !== null} onOpenChange={(open) => !open && setSubView(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <button onClick={() => setSubView(null)} className="hover:bg-accent/50 rounded-full p-1 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{getSubViewTitle()}</h2>
          </div>
          <div className="p-4">
            {renderSubViewContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YourInformationAndPermissions;
