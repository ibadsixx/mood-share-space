import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';
import {
  ChevronRight,
  ArrowLeft,
  Save,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Copy,
  QrCode,
  AlertCircle,
  KeyRound,
  Smartphone,
  Monitor,
  Bell,
  Mail,
  ShieldCheck,
} from 'lucide-react';

type SubView = 'main' | 'change-password' | 'two-factor' | 'where-logged-in' | 'login-alerts' | 'recent-emails' | 'security-checkup';

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordVisibility = {
  current: boolean;
  new: boolean;
  confirm: boolean;
};

type TOTPData = {
  secret: string;
  qr_code: string;
  verification_code: string;
  factor_id?: string;
  challenge_id?: string;
  enabled: boolean;
};

// Login Alerts sub-view component
const LoginAlertsView: React.FC<{
  profile: any;
  user: any;
  onBack: () => void;
}> = ({ profile, user, onBack }) => {
  const [alertDetail, setAlertDetail] = useState(false);
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('privacy_settings')
          .select('setting_name, setting_value')
          .eq('user_id', user.id)
          .in('setting_name', ['login_alerts_inapp', 'login_alerts_email']);

        data?.forEach((row: any) => {
          if (row.setting_name === 'login_alerts_inapp') setInApp(row.setting_value !== 'false');
          if (row.setting_name === 'login_alerts_email') setEmail(row.setting_value !== 'false');
        });
      } catch (e) {
        console.error('Error loading login alert settings:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const saveSetting = useCallback(async (name: string, value: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert({ user_id: user.id, setting_name: name, setting_value: value ? 'true' : 'false' }, { onConflict: 'user_id,setting_name' });
      if (error) throw error;
    } catch (e) {
      console.error('Error saving login alert setting:', e);
      toast({ title: 'Error', description: 'Failed to save setting', variant: 'destructive' });
    }
  }, [user, toast]);

  const summaryText = [inApp && 'In-app notifications', email && 'Email'].filter(Boolean).join(', ') || 'None';

  const SubHeader = ({ title, description, onBackFn }: { title: string; description: string; onBackFn: () => void }) => (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="icon" onClick={onBackFn}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  if (alertDetail) {
    return (
      <div className="space-y-6">
        <SubHeader title="Login alerts" description="Choose how to get alerts about unrecognized logins." onBackFn={() => setAlertDetail(false)} />
        <Card className="border-border/50">
          <CardContent className="p-0 divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">In-app notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified inside the app</p>
                </div>
              </div>
              <Switch
                checked={inApp}
                disabled={loading}
                onCheckedChange={(v) => { setInApp(v); saveSetting('login_alerts_inapp', v); toast({ title: v ? 'In-app alerts enabled' : 'In-app alerts disabled' }); }}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-xs text-muted-foreground">Send alerts to {user?.email || 'your email'}</p>
                </div>
              </div>
              <Switch
                checked={email}
                disabled={loading}
                onCheckedChange={(v) => { setEmail(v); saveSetting('login_alerts_email', v); toast({ title: v ? 'Email alerts enabled' : 'Email alerts disabled' }); }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SubHeader title="Login alerts" description="Manage how you'd like to be notified about unrecognized logins to your accounts." onBackFn={onBack} />
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <button
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent/50 transition-colors text-left"
            onClick={() => setAlertDetail(true)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.profile_pic || ''} alt={profile?.display_name || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{profile?.display_name || user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{loading ? 'Loading...' : summaryText}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

const PasswordAndSecurity: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { toast } = useToast();
  const [subView, setSubView] = useState<SubView>('main');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showRecentEmails, setShowRecentEmails] = useState(false);

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibility>({
    current: false, new: false, confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [totpData, setTotpData] = useState<TOTPData>({
    secret: '', qr_code: '', verification_code: '', factor_id: undefined, challenge_id: undefined, enabled: false,
  });
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);

  useEffect(() => {
    if (user) checkExistingMFA();
  }, [user]);

  const checkExistingMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totpFactor = data.totp.find(f => f.status === 'verified');
      if (totpFactor) {
        setTotpData(prev => ({ ...prev, enabled: true, factor_id: totpFactor.id }));
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) throw new Error('Please fill in all password fields');
      if (passwordData.newPassword !== passwordData.confirmPassword) throw new Error('Passwords do not match');
      if (passwordData.newPassword.length < 8) throw new Error('Password must be at least 8 characters');
      const hasUppercase = /[A-Z]/.test(passwordData.newPassword);
      const hasLowercase = /[a-z]/.test(passwordData.newPassword);
      const hasNumbers = /\d/.test(passwordData.newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);
      if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecial) throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: passwordData.currentPassword });
      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordVisibility({ current: false, new: false, confirm: false });
      setSubView('main');
    } catch (error: any) {
      toast({ title: 'Password Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setPasswordVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const setupTOTP = async () => {
    setTotpSetupLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Tone Authenticator' });
      if (error) throw error;
      const qrCodeDataUrl = await QRCode.toDataURL(data.totp.uri);
      setTotpData(prev => ({ ...prev, secret: data.totp.secret, qr_code: qrCodeDataUrl, factor_id: data.id }));
    } catch (error: any) {
      toast({ title: 'TOTP Setup Failed', description: error.message, variant: 'destructive' });
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const verifyTOTP = async () => {
    if (!totpData.verification_code || !totpData.factor_id) return;
    setTotpLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpData.factor_id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: totpData.factor_id, challengeId: challengeData.id, code: totpData.verification_code });
      if (verifyError) throw verifyError;
      setTotpData(prev => ({ ...prev, enabled: true, verification_code: '', challenge_id: challengeData.id }));
      toast({ title: 'Success', description: 'Two-factor authentication enabled!' });
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!totpData.factor_id) return;
    setTotpLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpData.factor_id });
      if (error) throw error;
      setTotpData({ secret: '', qr_code: '', verification_code: '', factor_id: undefined, challenge_id: undefined, enabled: false });
      toast({ title: 'Success', description: 'Two-factor authentication disabled' });
    } catch (error: any) {
      toast({ title: 'Disable Failed', description: error.message, variant: 'destructive' });
    } finally {
      setTotpLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(totpData.secret);
    toast({ title: 'Copied', description: 'Secret copied to clipboard' });
  };

  // Sub-header component
  const SubHeader = ({ title, description, onBack }: { title: string; description: string; onBack: () => void }) => (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );

  // Menu item component
  const MenuItem = ({ icon: Icon, label, description, onClick }: { icon: React.ElementType; label: string; description?: string; onClick: () => void }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors text-left">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground text-sm">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );

  if (subView === 'change-password') {
    return (
      <div className="space-y-6">
        <SubHeader title="Change password" description="Update your password to keep your account secure." onBack={() => setSubView('main')} />
        <form onSubmit={handlePasswordSubmit}>
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              {(['current', 'new', 'confirm'] as const).map((field) => {
                const labels = { current: 'Current Password', new: 'New Password', confirm: 'Confirm New Password' };
                const placeholders = { current: 'Enter your current password', new: 'Enter your new password', confirm: 'Confirm your new password' };
                const keys: Record<string, keyof PasswordData> = { current: 'currentPassword', new: 'newPassword', confirm: 'confirmPassword' };
                return (
                  <div key={field} className="space-y-2">
                    <Label>{labels[field]} *</Label>
                    <div className="relative">
                      <Input
                        type={passwordVisibility[field] ? 'text' : 'password'}
                        value={passwordData[keys[field]]}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, [keys[field]]: e.target.value }))}
                        placeholder={placeholders[field]}
                        required
                        className="pr-10"
                      />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => togglePasswordVisibility(field)}>
                        {passwordVisibility[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {field === 'new' && (
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters with uppercase, lowercase, numbers, and special characters</p>
                    )}
                  </div>
                );
              })}
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : <><Save className="w-4 h-4 mr-2" />Update Password</>}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  if (subView === 'two-factor') {
    return (
      <div className="space-y-6">
        <SubHeader title="Two-factor authentication" description="Add an extra layer of security to your account." onBack={() => setSubView('main')} />

        {!totpData.enabled && !totpData.qr_code && (
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Authenticator App (TOTP)</p>
                    <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar</p>
                  </div>
                </div>
                <Button onClick={setupTOTP} disabled={totpSetupLoading} variant="outline">
                  {totpSetupLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</> : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {totpData.qr_code && !totpData.enabled && (
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-medium text-foreground">Setup Instructions</h4>
              <p className="text-sm text-muted-foreground">1. Scan this QR code with your authenticator app:</p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={totpData.qr_code} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
              <p className="text-sm text-muted-foreground">2. Or manually enter this secret:</p>
              <div className="flex items-center gap-2">
                <Input value={totpData.secret} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copySecretToClipboard}><Copy className="w-4 h-4" /></Button>
              </div>
              <p className="text-sm text-muted-foreground">3. Enter the 6-digit code:</p>
              <div className="flex items-center gap-2">
                <Input type="text" maxLength={6} placeholder="000000" value={totpData.verification_code} onChange={(e) => setTotpData(prev => ({ ...prev, verification_code: e.target.value.replace(/\D/g, '') }))} className="font-mono text-center text-lg w-32" />
                <Button onClick={verifyTOTP} disabled={totpLoading || totpData.verification_code.length !== 6}>
                  {totpLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : <><Check className="w-4 h-4 mr-2" />Verify & Enable</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {totpData.enabled && (
          <>
            <Card className="border-border/50 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Two-Factor Authentication Enabled</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Your account is protected with TOTP</p>
                    </div>
                  </div>
                  <Button onClick={disableTOTP} disabled={totpLoading} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    {totpLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disabling...</> : 'Disable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">Backup Codes</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Save your recovery codes in a safe place in case you lose your authenticator device.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (subView === 'where-logged-in') {
    const ua = navigator.userAgent;
    
    // Detect device type
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobi)/i.test(ua);
    const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Computer';
    
    // Detect OS with version
    let osName = 'Unknown OS';
    const winMatch = ua.match(/Windows NT ([\d.]+)/);
    const macMatch = ua.match(/Mac OS X ([\d_.]+)/);
    const androidMatch = ua.match(/Android ([\d.]+)/);
    const iosMatch = ua.match(/(?:iPhone|iPad|iPod) OS ([\d_]+)/);
    const crosMatch = ua.match(/CrOS \S+ ([\d.]+)/);

    if (winMatch) {
      const ntVer = winMatch[1];
      const winVersions: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista' };
      osName = `Windows ${winVersions[ntVer] || ntVer}`;
    } else if (macMatch) {
      osName = `macOS ${macMatch[1].replace(/_/g, '.')}`;
    } else if (/Linux/i.test(ua) && !androidMatch) {
      osName = 'Linux';
    } else if (androidMatch) {
      osName = `Android ${androidMatch[1]}`;
    } else if (iosMatch) {
      osName = `iOS ${iosMatch[1].replace(/_/g, '.')}`;
    } else if (crosMatch) {
      osName = `Chrome OS ${crosMatch[1]}`;
    }
    
    // Detect browser
    let browserName = 'Unknown Browser';
    if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browserName = 'Opera';
    else if (/Chrome/i.test(ua)) browserName = 'Google Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Safari';
    else if (/Firefox/i.test(ua)) browserName = 'Firefox';
    
    const DeviceIcon = isMobile || isTablet ? Smartphone : Monitor;

    return (
      <div className="space-y-6">
        <SubHeader title="Where you're logged in" description="Review your active sessions across devices." onBack={() => setSubView('main')} />
        
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This device</p>
            </div>
            <div className="flex items-start gap-4 px-4 py-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <DeviceIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">{browserName}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Active now
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{deviceType} · {osName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Near your current location
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
          Log out of all other devices
        </Button>
      </div>
    );
  }

  if (subView === 'login-alerts') {
    return <LoginAlertsView profile={profile} user={user} onBack={() => setSubView('main')} />;
  }

  if (subView === 'security-checkup') {
    return (
      <div className="space-y-6">
        <SubHeader title="Security Checkup" description="Run a security check across your account." onBack={() => setSubView('main')} />
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">This feature is coming soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view — Facebook-style grouped list
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Password and security</h2>
        <p className="text-muted-foreground">Manage your passwords, login preferences and recovery methods.</p>
      </div>

      {/* Login & recovery */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Login & recovery</h3>
        <p className="text-sm text-muted-foreground">Manage your passwords, login preferences and recovery methods.</p>
         <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <MenuItem icon={KeyRound} label="Change password" onClick={() => setShowAccountPicker(true)} />
            <Separator />
            <MenuItem icon={Smartphone} label="Two-factor authentication" description={totpData.enabled ? 'Enabled' : 'Not enabled'} onClick={() => setSubView('two-factor')} />
          </CardContent>
        </Card>

        {/* Change Password Dialog */}
        <Dialog open={showAccountPicker} onOpenChange={(open) => { setShowAccountPicker(open); if (!open) setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
          <DialogContent className="sm:max-w-lg p-0 gap-0">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <Button variant="ghost" size="icon" onClick={() => setShowAccountPicker(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <DialogTitle className="text-base font-semibold">Password and security</DialogTitle>
              <div className="w-9" />
            </div>
            <DialogDescription className="sr-only">Change your account password</DialogDescription>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{profile?.display_name || user?.email}</p>
                <h3 className="text-xl font-bold text-foreground">Change password</h3>
                <p className="text-sm text-muted-foreground mt-1">Your password must be at least 6 characters and should include a combination of numbers, letters and special characters (!$@%).</p>
              </div>
              <form onSubmit={(e) => { handlePasswordSubmit(e).then(() => setShowAccountPicker(false)); }} className="space-y-3">
                <Input
                  type={passwordVisibility.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Current password"
                  className="h-12 bg-accent/30 border-border/50"
                />
                <Input
                  type={passwordVisibility.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="New password"
                  className="h-12 bg-accent/30 border-border/50"
                />
                <Input
                  type={passwordVisibility.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-type new password"
                  className="h-12 bg-accent/30 border-border/50"
                />
                <button type="button" className="text-sm text-primary hover:underline">Forgot your password?</button>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="logout-others" defaultChecked className="rounded border-border accent-primary w-4 h-4" />
                  <label htmlFor="logout-others" className="text-sm text-foreground">Log out of other devices. Choose this if someone else used your account.</label>
                </div>
                <Button type="submit" disabled={passwordLoading} className="w-full h-12 mt-2 text-base font-semibold rounded-full">
                  {passwordLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</> : 'Change password'}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security checks */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Security checks</h3>
        <p className="text-sm text-muted-foreground">Review security issues by running checks across apps, devices and emails sent.</p>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <MenuItem icon={Monitor} label="Where you're logged in" onClick={() => setSubView('where-logged-in')} />
            <Separator />
            <MenuItem icon={Bell} label="Login alerts" onClick={() => setSubView('login-alerts')} />
            <Separator />
            <MenuItem icon={Mail} label="Recent emails" onClick={() => setShowRecentEmails(true)} />
            <Separator />
            <MenuItem icon={ShieldCheck} label="Security Checkup" onClick={() => setSubView('security-checkup')} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails Dialog */}
      <Dialog open={showRecentEmails} onOpenChange={setShowRecentEmails}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-foreground">Recent emails</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select the account for which you want to see recent emails.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => {
                    setShowRecentEmails(false);
                    toast({ title: 'Recent emails', description: 'No recent security emails found for this account.' });
                  }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile?.profile_pic || ''} alt={profile?.display_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{profile?.display_name || user?.email || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.username ? `@${profile.username}` : user?.email}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordAndSecurity;
