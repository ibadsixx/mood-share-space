import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import PhotoUploadDialog from '@/components/PhotoUploadDialog';
import YourInformationAndPermissions from '@/components/YourInformationAndPermissions';
import ProfilesAndPersonalDetails from '@/components/settings/ProfilesAndPersonalDetails';
import AdPreferences from '@/components/AdPreferences';
import PrivacyCheckup from '@/components/PrivacyCheckup';
import PasswordAndSecurity from '@/components/settings/PasswordAndSecurity';
import QRCode from 'qrcode';
import { 
  User, 
  Shield, 
  Info, 
  Target, 
  Eye, 
  Activity,
  Camera,
  Save,
  Trash2,
  ExternalLink,
  AlertCircle,
  Check,
  EyeOff,
  Copy,
  QrCode,
  Loader2,
  UserX,
  Settings as SettingsIcon,
  Hash
} from 'lucide-react';
import BlockedUsersManager from '@/components/BlockedUsersManager';
import { AdminReportsManager } from '@/components/AdminReportsManager';
import { useHashtagNotificationSettings } from '@/hooks/useHashtagNotificationSettings';
import NotificationSettings from '@/components/NotificationSettings';

// Define types for the sidebar menu and form data
type SidebarOption = {
  id: string;
  title: string;
  icon: React.ElementType;
};

type PersonalDetails = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  profilePhoto: string;
};

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type TOTPData = {
  secret: string;
  qr_code: string;
  verification_code: string;
  factor_id?: string;
  challenge_id?: string;
  enabled: boolean;
};

type PasswordVisibility = {
  current: boolean;
  new: boolean;
  confirm: boolean;
};

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadPhoto, uploading } = usePhotoUpload();
  const { enabled: hashtagNotificationsEnabled, loading: hashtagNotifLoading, toggleNotifications: toggleHashtagNotifications } = useHashtagNotificationSettings();
  
  // State for active sidebar option
  const [activeSection, setActiveSection] = useState('personal');
  
  // Check if user is admin (simple check - you can enhance this with proper role system)
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State for personal details form
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    profilePhoto: ''
  });

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      loadUserData();
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('bio, display_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Simple admin check - you can enhance this with proper role system
      const isUserAdmin = profile.bio?.toLowerCase().includes('admin') || 
                         profile.display_name?.toLowerCase().includes('admin');
      setIsAdmin(isUserAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Split display name into first and last name
      const nameParts = profile.display_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setPersonalDetails({
        firstName,
        lastName,
        email: user.email || '',
        bio: profile.bio || '',
        profilePhoto: profile.profile_pic || ''
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive'
      });
    }
  };
  
  // State for password form
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // State for password visibility toggles
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibility>({
    current: false,
    new: false,
    confirm: false
  });
  
  // State for TOTP/2FA
  const [totpData, setTotpData] = useState<TOTPData>({
    secret: '',
    qr_code: '',
    verification_code: '',
    factor_id: undefined,
    challenge_id: undefined,
    enabled: false
  });
  
  // Loading states
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  
  // State for privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    postsVisibility: true,
    activityStatus: false,
    dataCollection: true
  });

  const sidebarOptions: SidebarOption[] = [
    { id: 'personal', title: 'Personal details', icon: User },
    { id: 'security', title: 'Password and security', icon: Shield },
    { id: 'permissions', title: 'Your information and permissions', icon: Info },
    { id: 'ads', title: 'Ad preferences', icon: Target },
    { id: 'privacy', title: 'Privacy Checkup', icon: Eye },
    { id: 'activity', title: 'Your activity', icon: Activity },
    { id: 'notifications', title: 'Notification Settings', icon: Hash },
    { id: 'blocked', title: 'Blocked Users', icon: UserX },
    ...(isAdmin ? [{ id: 'admin', title: 'Admin Reports', icon: SettingsIcon }] : [])
  ];

  // Handle form submissions with validation
  const handlePersonalDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalDetails.firstName || !personalDetails.lastName || !personalDetails.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) return;

    try {
      // Update profile in database
      const displayName = `${personalDetails.firstName} ${personalDetails.lastName}`.trim();
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: personalDetails.bio
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (personalDetails.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: personalDetails.email
        });

        if (emailError) throw emailError;
      }
      
      toast({
        title: 'Success',
        description: 'Personal details updated successfully!'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update personal details',
        variant: 'destructive'
      });
    }
  };

  const handlePhotoUpload = async (file: File, customText?: string) => {
    if (!user?.id) return;
    
    try {
      const publicUrl = await uploadPhoto(file, 'profile', user.id, customText);
      setPersonalDetails(prev => ({ ...prev, profilePhoto: publicUrl }));
    } catch (error) {
      // Error handled in the hook
    }
  };

  // Check for existing MFA factors on component mount
  useEffect(() => {
    if (user) {
      checkExistingMFA();
    }
  }, [user]);

  const checkExistingMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const totpFactor = data.totp.find(factor => factor.status === 'verified');
      if (totpFactor) {
        setTotpData(prev => ({
          ...prev,
          enabled: true,
          factor_id: totpFactor.id
        }));
      }
    } catch (error: any) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      // Validate form data
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error('Please fill in all password fields');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New password and confirmation do not match');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check password strength
      const hasUppercase = /[A-Z]/.test(passwordData.newPassword);
      const hasLowercase = /[a-z]/.test(passwordData.newPassword);
      const hasNumbers = /\d/.test(passwordData.newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);

      if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecial) {
        throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
      }

      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Password updated successfully!'
      });

      // Reset form
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordVisibility({ current: false, new: false, confirm: false });

    } catch (error: any) {
      toast({
        title: 'Password Update Failed',
        description: error.message || 'Failed to update password',
        variant: 'destructive'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const setupTOTP = async () => {
    setTotpSetupLoading(true);
    
    try {
      // Step 1: Enroll a new TOTP factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Tone Authenticator'
      });

      if (error) throw error;

      // Generate QR code from the URI
      const qrCodeDataUrl = await QRCode.toDataURL(data.totp.uri);

      setTotpData(prev => ({
        ...prev,
        secret: data.totp.secret,
        qr_code: qrCodeDataUrl,
        factor_id: data.id
      }));

    } catch (error: any) {
      toast({
        title: 'TOTP Setup Failed',
        description: error.message || 'Failed to setup two-factor authentication',
        variant: 'destructive'
      });
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!totpData.verification_code || !totpData.factor_id) return;
    
    setTotpLoading(true);

    try {
      // Step 2: Challenge the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpData.factor_id
      });

      if (challengeError) throw challengeError;

      // Step 3: Verify the TOTP code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpData.factor_id,
        challengeId: challengeData.id,
        code: totpData.verification_code
      });

      if (verifyError) throw verifyError;

      setTotpData(prev => ({
        ...prev,
        enabled: true,
        verification_code: '',
        challenge_id: challengeData.id
      }));

      toast({
        title: 'Success',
        description: 'Two-factor authentication enabled successfully!'
      });

    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive'
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!totpData.factor_id) return;

    setTotpLoading(true);

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totpData.factor_id
      });

      if (error) throw error;

      setTotpData({
        secret: '',
        qr_code: '',
        verification_code: '',
        factor_id: undefined,
        challenge_id: undefined,
        enabled: false
      });

      toast({
        title: 'Success',
        description: 'Two-factor authentication disabled'
      });

    } catch (error: any) {
      toast({
        title: 'Disable Failed',
        description: error.message || 'Failed to disable two-factor authentication',
        variant: 'destructive'
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(totpData.secret);
    toast({
      title: 'Copied',
      description: 'Secret copied to clipboard'
    });
  };

  const handlePrivacyUpdate = (setting: string, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [setting]: value }));
    toast({
      title: 'Privacy Settings Updated',
      description: `${setting} has been ${value ? 'enabled' : 'disabled'}.`
    });
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'personal':
        return <ProfilesAndPersonalDetails />;

      case 'security':
        return <PasswordAndSecurity />;

      case 'permissions':
        return <YourInformationAndPermissions />;

      case 'ads':
        return <AdPreferences />;

      case 'privacy':
        return <PrivacyCheckup />;

      case 'activity':
        return <YourActivity />;

      case 'blocked':
        return <BlockedUsersManager />;

      case 'notifications':
        return <NotificationSettings />;

      case 'admin':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Admin Reports</h2>
              <p className="text-muted-foreground">Manage and review reported profiles from the community.</p>
            </div>
            <AdminReportsManager />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-border/50 sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {sidebarOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = activeSection === option.id;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => setActiveSection(option.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium transition-all duration-200 rounded-none first:rounded-t-none last:rounded-b-lg ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            <div className="transition-all duration-300 ease-in-out">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;