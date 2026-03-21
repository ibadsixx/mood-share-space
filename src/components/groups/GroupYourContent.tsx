import { useState } from 'react';
import { ArrowLeft, MessageSquare, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GroupYourContentProps {
  groupName: string;
  onBack: () => void;
}

const tabs = [
  { key: 'pending', label: 'Pending', icon: MessageSquare },
  { key: 'published', label: 'Published', icon: CheckCircle },
  { key: 'declined', label: 'Declined', icon: XCircle },
  { key: 'removed', label: 'Removed', icon: Trash2 },
] as const;

type TabKey = typeof tabs[number]['key'];

const GroupYourContent = ({ groupName, onBack }: GroupYourContentProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{groupName} › Your content</p>
          <h1 className="text-xl font-bold">Your content</h1>
          <p className="text-sm text-muted-foreground">
            Manage and view your posts in the group. Admins and moderators may have feedback.
          </p>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border p-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg font-semibold text-muted-foreground">No posts to show</p>
        </div>
      </div>
    </div>
  );
};

export default GroupYourContent;
