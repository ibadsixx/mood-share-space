import React, { useState } from 'react';
import { ChevronRight, Instagram, Facebook } from 'lucide-react';
import YourActivity from './YourActivity';

type SubPage = 'main' | 'export' | 'access' | 'search' | 'activity' | 'connections' | 'contacts' | 'identity';

const YourInformationAndPermissions: React.FC = () => {
  const [subPage, setSubPage] = useState<SubPage>('main');

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
    { id: 'export' as SubPage, label: 'Download your data' },
    { id: 'access' as SubPage, label: 'View your data' },
    { id: 'search' as SubPage, label: 'Search history' },
  ];

  const bottomItems = [
    { id: 'activity' as SubPage, label: 'Your activity outside Tone', icon: null },
    { id: 'connections' as SubPage, label: 'App connections', icon: null },
    { id: 'contacts' as SubPage, label: 'Manage contacts', icon: <Instagram className="w-4 h-4 text-muted-foreground" /> },
    { id: 'identity' as SubPage, label: 'Identity verification', icon: <Facebook className="w-4 h-4 text-muted-foreground" /> },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
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
            onClick={() => setSubPage(item.id)}
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

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        Manage what data Tone can use to personalize your experience.
      </p>
    </div>
  );
};

export default YourInformationAndPermissions;
