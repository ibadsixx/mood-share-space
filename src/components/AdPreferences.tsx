import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Bookmark, 
  Eye, 
  Target, 
  Database, 
  Shield, 
  Users, 
  Building2,
  Info
} from 'lucide-react';

// Types for the ad preferences options
type AdOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

const AdPreferences = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState('customize');
  
  // State for selected option within each tab
  const [selectedCustomizeOption, setSelectedCustomizeOption] = useState('activity');
  const [selectedManageOption, setSelectedManageOption] = useState('categories');

  // Customize ads options
  const customizeOptions: AdOption[] = [
    {
      id: 'activity',
      title: 'Ad activity',
      description: 'See and manage your ad activity, including ads you\'ve clicked on and interacted with.',
      icon: Activity
    },
    {
      id: 'saved',
      title: 'Ads you saved',
      description: 'View and manage the advertisements you\'ve saved for later reference.',
      icon: Bookmark
    },
    {
      id: 'advertisers',
      title: 'Advertisers you saw ads from',
      description: 'See a list of advertisers whose ads have been shown to you recently.',
      icon: Eye
    },
    {
      id: 'topics',
      title: 'Ad topics',
      description: 'Manage the topics and categories used to show you relevant advertisements.',
      icon: Target
    }
  ];

  // Manage info options
  const manageOptions: AdOption[] = [
    {
      id: 'categories',
      title: 'Categories used to reach you',
      description: 'See what categories advertisers use to target ads to you based on your activity.',
      icon: Target
    },
    {
      id: 'partner-activity',
      title: 'Activity information from ad partners',
      description: 'Manage how information from our advertising partners is used to show you ads.',
      icon: Database
    },
    {
      id: 'audience-based',
      title: 'Audience-based advertising',
      description: 'Control how you\'re included in advertising audiences based on your interests.',
      icon: Users
    },
    {
      id: 'partner-ads',
      title: 'Ads from ad partners',
      description: 'Manage advertisements shown to you from our trusted advertising partners.',
      icon: Building2
    },
    {
      id: 'meta-ads',
      title: 'Ads about Meta',
      description: 'Control advertisements about Meta products and services shown to you.',
      icon: Info
    },
    {
      id: 'social-interactions',
      title: 'Social interactions',
      description: 'Manage how your social interactions influence the advertisements you see.',
      icon: Shield
    }
  ];

  // Handle tab change and reset sub-option selection
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'customize') {
      setSelectedCustomizeOption('activity');
    } else {
      setSelectedManageOption('categories');
    }
  };

  // Get current selected option based on active tab
  const getCurrentOption = () => {
    if (activeTab === 'customize') {
      return customizeOptions.find(opt => opt.id === selectedCustomizeOption);
    } else {
      return manageOptions.find(opt => opt.id === selectedManageOption);
    }
  };

  // Get current options list based on active tab
  const getCurrentOptions = () => {
    return activeTab === 'customize' ? customizeOptions : manageOptions;
  };

  // Get current selected option ID
  const getCurrentSelectedOption = () => {
    return activeTab === 'customize' ? selectedCustomizeOption : selectedManageOption;
  };

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    if (activeTab === 'customize') {
      setSelectedCustomizeOption(optionId);
    } else {
      setSelectedManageOption(optionId);
    }
  };

  const currentOption = getCurrentOption();
  const currentOptions = getCurrentOptions();
  const currentSelectedOption = getCurrentSelectedOption();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ad Preferences</h2>
        <p className="text-muted-foreground">
          Manage your advertising preferences and control how ads are personalized for you.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="customize" className="text-sm font-medium">
            Customize ads
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-sm font-medium">
            Manage info
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="customize" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Options List */}
            <Card className="lg:col-span-1 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Customize Options</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {currentOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option.id)}
                        className={`w-full text-left p-4 rounded-none border-none transition-colors ${
                          currentSelectedOption === option.id
                            ? 'bg-primary/10 text-primary border-r-2 border-primary'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium text-sm">{option.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Right Content Area */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {currentOption && (
                    <>
                      <currentOption.icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">{currentOption.title}</CardTitle>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentOption && (
                  <>
                    <p className="text-muted-foreground leading-relaxed">
                      {currentOption.description}
                    </p>
                    
                    {/* Placeholder content area */}
                    <div className="space-y-4 pt-4">
                      <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border">
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <currentOption.icon className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-medium text-foreground">Content Area</h3>
                          <p className="text-sm text-muted-foreground">
                            This section will display {currentOption.title.toLowerCase()} settings and options.
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            Coming Soon
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Options List */}
            <Card className="lg:col-span-1 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Manage Options</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {currentOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option.id)}
                        className={`w-full text-left p-4 rounded-none border-none transition-colors ${
                          currentSelectedOption === option.id
                            ? 'bg-primary/10 text-primary border-r-2 border-primary'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium text-sm">{option.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Right Content Area */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {currentOption && (
                    <>
                      <currentOption.icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">{currentOption.title}</CardTitle>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentOption && (
                  <>
                    <p className="text-muted-foreground leading-relaxed">
                      {currentOption.description}
                    </p>
                    
                    {/* Placeholder content area */}
                    <div className="space-y-4 pt-4">
                      <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-border">
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                            <currentOption.icon className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-medium text-foreground">Content Area</h3>
                          <p className="text-sm text-muted-foreground">
                            This section will display {currentOption.title.toLowerCase()} settings and options.
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            Coming Soon
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdPreferences;