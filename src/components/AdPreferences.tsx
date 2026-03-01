import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const AdPreferences = () => {
  const [activeTab, setActiveTab] = useState('customize');

  // Mock ad activity data
  const adActivity = [
    { id: '1', title: 'Summer Collection', advertiser: 'StyleHub', image: '/placeholder.svg' },
    { id: '2', title: 'New Arrivals', advertiser: 'TrendWear', image: '/placeholder.svg' },
  ];

  // Mock saved ads
  const savedAds = [
    { id: '1', title: 'Premium Deals', subtitle: 'Best Offers', image: '/placeholder.svg' },
    { id: '2', title: 'Premium Deals', subtitle: 'Best Offers', image: '/placeholder.svg' },
    { id: '3', title: 'Creative Studio', subtitle: 'Design Pro', image: '/placeholder.svg' },
    { id: '4', title: 'Fresh Brands', subtitle: 'Fresh Brands', image: '/placeholder.svg' },
    { id: '5', title: 'Art Corner', subtitle: 'Art Corner', image: '/placeholder.svg' },
  ];

  // Mock advertisers
  const advertisers = [
    { id: '1', name: 'Duolingo', icon: '🟢' },
    { id: '2', name: 'Canva', icon: '🟣' },
    { id: '3', name: 'Figma', icon: '🔵' },
  ];

  // Mock ad topics
  const adTopics = [
    { id: '1', name: 'Smartphones', icon: '📱' },
    { id: '2', name: 'Fitness & gym gear', icon: '💪' },
    { id: '3', name: 'Apparel', icon: '👕' },
  ];

  // Mock categories for manage info
  const reachCategories = [
    { id: '1', name: 'Shopping habits', icon: '🛒' },
    { id: '2', name: 'Travel interests', icon: '✈️' },
    { id: '3', name: 'Tech enthusiast', icon: '💻' },
  ];

  const partnerActivity = [
    { id: '1', name: 'Analytics providers', icon: '📊' },
    { id: '2', name: 'Marketing platforms', icon: '📢' },
  ];

  const audienceBased = [
    { id: '1', name: 'Interest groups', icon: '🎯' },
    { id: '2', name: 'Behavioral segments', icon: '📈' },
  ];

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {onSeeAll && (
        <button className="text-xs font-medium text-primary hover:underline">View all</button>
      )}
    </div>
  );

  const ListItem = ({ name, icon }: { name: string; icon: string }) => (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ad Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Take charge of your advertising experience and the data used to display ads to you.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none w-auto gap-4 h-auto p-0">
          <TabsTrigger
            value="customize"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium"
          >
            Tailor ads
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm font-medium text-muted-foreground"
          >
            Handle info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customize" className="mt-6 space-y-6">
          {/* Ad activity */}
          <div>
            <SectionHeader title="Ad interactions" onSeeAll={() => {}} />
            <div className="grid grid-cols-2 gap-3">
              {adActivity.map((ad) => (
                <div key={ad.id} className="rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                  <div className="aspect-video bg-muted/50 relative">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground truncate">{ad.advertiser}</p>
                    <button className="w-full mt-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md py-1.5 hover:bg-primary/90 transition-colors">
                      Ad info
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Saved ads */}
          <div>
            <SectionHeader title="Bookmarked ads" onSeeAll={() => {}} />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedAds.map((ad) => (
                <div key={ad.id} className="flex-shrink-0 w-20">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/50 border border-border/50">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-foreground mt-1 truncate">{ad.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ad.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Advertisers */}
          <div>
            <SectionHeader title="Brands that showed you ads" onSeeAll={() => {}} />
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {advertisers.map((adv, i) => (
                <React.Fragment key={adv.id}>
                  <ListItem name={adv.name} icon={adv.icon} />
                  {i < advertisers.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Separator />

          {/* Ad topics */}
          <div>
            <SectionHeader title="Ad subjects" onSeeAll={() => {}} />
            <div className="rounded-xl overflow-hidden bg-accent/30 border border-border/50 mb-3 p-6 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Browse ad subjects and explore what you'd like to see more of.</p>
            </div>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {adTopics.map((topic, i) => (
                <React.Fragment key={topic.id}>
                  <ListItem name={topic.name} icon={topic.icon} />
                  {i < adTopics.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6 space-y-6">
          {/* Categories */}
          <div>
            <SectionHeader title="Segments used to target you" onSeeAll={() => {}} />
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {reachCategories.map((cat, i) => (
                <React.Fragment key={cat.id}>
                  <ListItem name={cat.name} icon={cat.icon} />
                  {i < reachCategories.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Separator />

          {/* Partner activity */}
          <div>
            <SectionHeader title="Data from advertising partners" onSeeAll={() => {}} />
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {partnerActivity.map((item, i) => (
                <React.Fragment key={item.id}>
                  <ListItem name={item.name} icon={item.icon} />
                  {i < partnerActivity.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Separator />

          {/* Audience-based */}
          <div>
            <SectionHeader title="Interest-driven advertising" onSeeAll={() => {}} />
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {audienceBased.map((item, i) => (
                <React.Fragment key={item.id}>
                  <ListItem name={item.name} icon={item.icon} />
                  {i < audienceBased.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdPreferences;
