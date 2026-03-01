import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Eye, Search, Database, ShieldCheck, Megaphone } from 'lucide-react';

interface CheckupTopic {
  id: string;
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  timeAgo: string;
}

const topics: CheckupTopic[] = [
  {
    id: 'visibility',
    title: 'Who Can View What You Post',
    icon: <Eye className="h-10 w-10 text-white" />,
    bgColor: 'bg-orange-500',
    timeAgo: '2 years ago',
  },
  {
    id: 'discoverability',
    title: 'How Others Can Locate You',
    icon: <Search className="h-10 w-10 text-white" />,
    bgColor: 'bg-blue-500',
    timeAgo: 'A year ago',
  },
  {
    id: 'data',
    title: 'Your Information Preferences',
    icon: <Database className="h-10 w-10 text-white" />,
    bgColor: 'bg-teal-600',
    timeAgo: 'A year ago',
  },
  {
    id: 'security',
    title: 'How to Protect Your Account',
    icon: <ShieldCheck className="h-10 w-10 text-white" />,
    bgColor: 'bg-indigo-600',
    timeAgo: 'About 11 months ago',
  },
  {
    id: 'ads',
    title: 'Your Ad Choices',
    icon: <Megaphone className="h-10 w-10 text-white" />,
    bgColor: 'bg-pink-500',
    timeAgo: '',
  },
];

const PrivacyCheckup = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Checkup</h1>
      <p className="text-muted-foreground mb-8">
        We'll walk you through key settings so you can make the best decisions for your account.
        Which topic would you like to begin with?
      </p>

      {/* First row - 2 cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {topics.slice(0, 2).map((topic) => (
          <button
            key={topic.id}
            onClick={() => setSelected(topic.id)}
            className={`rounded-xl overflow-hidden text-left transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none ${
              selected === topic.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`${topic.bgColor} h-32 flex items-center justify-center`}>
              {topic.icon}
            </div>
            <div className="bg-card p-3">
              <p className="font-semibold text-foreground text-sm leading-tight">{topic.title}</p>
              {topic.timeAgo && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {topic.timeAgo}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Second row - 3 cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {topics.slice(2).map((topic) => (
          <button
            key={topic.id}
            onClick={() => setSelected(topic.id)}
            className={`rounded-xl overflow-hidden text-left transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none ${
              selected === topic.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`${topic.bgColor} h-28 flex items-center justify-center`}>
              {topic.icon}
            </div>
            <div className="bg-card p-3">
              <p className="font-semibold text-foreground text-sm leading-tight">{topic.title}</p>
              {topic.timeAgo && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {topic.timeAgo}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        You can review additional privacy options in{' '}
        <Link to="/settings" className="text-primary hover:underline font-medium">
          Settings
        </Link>
      </p>
    </div>
  );
};

export default PrivacyCheckup;
