import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, Bookmark, Eye, Target, Database, Shield, Users, Building2, Info } from 'lucide-react';
import { useAdActivity, useAdTopics, useAdAdvertisers, useAdSettings } from '@/hooks/useAdPreferences';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const AdPreferences = () => {
  const [activeTab, setActiveTab] = useState('customize');
  const { data: adActivity, isLoading: loadingActivity } = useAdActivity();
  const { data: adTopics, isLoading: loadingTopics } = useAdTopics();
  const { data: adAdvertisers, isLoading: loadingAdvertisers } = useAdAdvertisers();
  const { data: adSettings } = useAdSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Ad Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Take charge of your ad experience and the data used to display your ads.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="customize" className="text-sm font-medium">Customize ads</TabsTrigger>
          <TabsTrigger value="manage" className="text-sm font-medium">Manage info</TabsTrigger>
        </TabsList>

        {/* ========== CUSTOMIZE ADS TAB ========== */}
        <TabsContent value="customize" className="space-y-8">

          {/* --- Ad activity --- */}
          <Section title="Ad activity" action="See all">
            {loadingActivity ? (
              <div className="flex gap-4">
                <Skeleton className="h-48 w-52 rounded-lg" />
                <Skeleton className="h-48 w-52 rounded-lg" />
              </div>
            ) : adActivity && adActivity.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {adActivity.slice(0, 4).map((ad) => (
                  <div key={ad.id} className="flex-shrink-0 w-52 rounded-lg overflow-hidden border border-border bg-card">
                    <div className="h-28 bg-muted flex items-center justify-center overflow-hidden">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground truncate">{ad.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{ad.advertiser}</p>
                      <Button variant="default" size="sm" className="w-full text-xs">Ad details</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent ad interactions recorded.</p>
            )}
          </Section>

          {/* --- Saved ads --- */}
          <Section title="Ads you bookmarked" action="See all">
            {loadingActivity ? (
              <div className="flex gap-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-20 rounded-lg" />)}
              </div>
            ) : adActivity && adActivity.filter(a => a.image_url).length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {adActivity.filter(a => a.image_url).slice(0, 8).map((ad) => (
                  <div key={ad.id} className="flex-shrink-0 w-20 space-y-1">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={ad.image_url!} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ad.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bookmarked advertisements yet.</p>
            )}
          </Section>

          {/* --- Advertisers --- */}
          <Section title="Advertisers who showed you ads" action="See all">
            {loadingAdvertisers ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : adAdvertisers && adAdvertisers.length > 0 ? (
              <div className="border border-border rounded-lg divide-y divide-border">
                {adAdvertisers.slice(0, 5).map((adv) => (
                  <button key={adv.id} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={adv.icon || ''} />
                        <AvatarFallback className="text-xs bg-muted">{adv.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{adv.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No advertiser records found.</p>
            )}
          </Section>

          {/* --- Ad topics --- */}
          <Section title="Ad topics" subtitle="Manage subjects and browse what you prefer to view less of." action="See all">
            {loadingTopics ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : adTopics && adTopics.length > 0 ? (
              <div className="space-y-3">
                {/* Banner placeholder */}
                <div className="h-36 rounded-lg bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/40 flex items-center justify-center">
                  <Target className="w-10 h-10 text-primary/60" />
                </div>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {adTopics.slice(0, 5).map((topic) => (
                    <button key={topic.id} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-sm">{topic.icon || '📌'}</span>
                        </div>
                        <span className="text-sm text-foreground">{topic.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ad topics configured yet.</p>
            )}
          </Section>
        </TabsContent>

        {/* ========== MANAGE INFO TAB ========== */}
        <TabsContent value="manage" className="space-y-6">
          <ManageInfoList settings={adSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ---------- Section wrapper ---------- */
const Section = ({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <button className="text-xs text-primary hover:underline font-medium">{action}</button>}
    </div>
    {children}
  </div>
);

/* ---------- Manage Info list ---------- */
const ManageInfoList = ({ settings }: { settings: any }) => {
  const items = [
    { icon: Target, label: 'Categories used to reach you', description: 'View the categories advertisers rely on to target ads based on your behavior.' },
    { icon: Database, label: 'Activity data from ad partners', description: 'Control how partner-shared information personalizes your ad experience.', toggle: settings?.use_partner_data },
    { icon: Users, label: 'Audience-based advertising', description: 'Adjust how you are grouped into ad audiences by your preferences.' },
    { icon: Building2, label: 'Ads from partnered networks', description: 'Oversee advertisements delivered through our trusted partner channels.' },
    { icon: Info, label: 'Promotions about Tone', description: 'Manage promotional content for Tone products and services shown to you.' },
    { icon: Shield, label: 'Social interactions', description: 'Decide how your social activity shapes the ads displayed to you.', toggle: settings?.social_interactions_visibility },
  ];

  return (
    <div className="border border-border rounded-lg divide-y divide-border">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
          </button>
        );
      })}
    </div>
  );
};

export default AdPreferences;
