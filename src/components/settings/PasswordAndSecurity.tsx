import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, ArrowLeft, Shield, Key, Smartphone, LogIn, Bell, Mail, ShieldCheck, Loader2, Eye, EyeOff, Check, Copy, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

type SubView = 'main' | 'change-password' | 'two-factor' | 'saved-login' | 'passkey' | 'where-logged-in' | 'login-alerts' | 'recent-emails' | 'security-checkup';

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

const PasswordAndSecurity: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subView, setSubView] = useState<SubView>('main');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibility>({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // TOTP state
  const [totpData, setTotpData] = useState<TOTPData>({ secret: '', qr_code: '', verification_code: '', enabled: false });
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

  const handlePasswordSubmit = async () => {
    setPasswordLoading(true);
    try {
      if (!currentPassword || !newPassword || !confirmPassword) throw new Error('Please fill in all password fields');
      if (newPassword !== confirmPassword) throw new Error('New password and confirmation do not match');
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters long');

      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
      if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecial) {
        throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: currentPassword });
      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Password updated successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordVisibility({ current: false, new: false, confirm: false });
      setSubView('main');
    } catch (error: any) {
      toast({ title: 'Password Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setPasswordLoading(false);
    }
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
      setTotpData(prev => ({ ...prev, enabled: true, verification_code: '' }));
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
      setTotpData({ secret: '', qr_code: '', verification_code: '', enabled: false });
      toast({ title: 'Success', description: 'Two-factor authentication disabled' });
    } catch (error: any) {
      toast({ title: 'Disable Failed', description: error.message, variant: 'destructive' });
    } finally {
      setTotpLoading(false);
    }
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setPasswordVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const PasswordField = ({ id, label, value, onChange, field }: { id: string; label: string; value: string; onChange: (v: string) => void; field: keyof PasswordVisibility }) => (
    <div className="px-4 pt-3 pb-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={passwordVisibility[field] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-0 px-0 pr-10 focus-visible:ring-0 shadow-none text-foreground"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {passwordVisibility[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  // Change Password Dialog
  const changePasswordDialog = (
    <Dialog open={subView === 'change-password'} onOpenChange={(open) => !open && setSubView('main')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={() => setSubView('main')} className="hover:bg-accent rounded-full p-1 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            Change password
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Your password must be at least 8 characters and include a mix of uppercase, lowercase, numbers, and special characters.
        </p>

        <div className="space-y-0 border rounded-lg border-border/50 overflow-hidden">
          <PasswordField id="currentPassword" label="Current password" value={currentPassword} onChange={setCurrentPassword} field="current" />
          <Separator />
          <PasswordField id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} field="new" />
          <Separator />
          <PasswordField id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} field="confirm" />
        </div>

        <p className="text-xs text-muted-foreground">
          Changing your password will log you out of all other devices. You will need to sign in again with the new password.
        </p>

        <Button className="w-full" onClick={handlePasswordSubmit} disabled={passwordLoading}>
          {passwordLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : 'Change password'}
        </Button>
      </DialogContent>
    </Dialog>
  );

  // Two-Factor Auth Dialog
  const twoFactorDialog = (
    <Dialog open={subView === 'two-factor'} onOpenChange={(open) => !open && setSubView('main')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={() => setSubView('main')} className="hover:bg-accent rounded-full p-1 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            Two-factor authentication
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Add an extra layer of security using an authenticator app like Google Authenticator, Authy, or 1Password.
        </p>

        {!totpData.enabled && !totpData.qr_code && (
          <div className="border rounded-lg border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-foreground text-sm">Authenticator App (TOTP)</p>
                <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or similar</p>
              </div>
              <Button variant="outline" size="sm" onClick={setupTOTP} disabled={totpSetupLoading}>
                {totpSetupLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Setting up…</> : 'Enable'}
              </Button>
            </div>
          </div>
        )}

        {totpData.qr_code && !totpData.enabled && (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg border border-border/50">
              <img src={totpData.qr_code} alt="TOTP QR Code" className="w-40 h-40" />
            </div>

            <div className="border rounded-lg border-border/50 overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <Label className="text-xs text-muted-foreground">Secret key</Label>
                <div className="flex items-center gap-2">
                  <Input value={totpData.secret} readOnly className="border-0 px-0 focus-visible:ring-0 shadow-none text-foreground font-mono text-xs flex-1" />
                  <button onClick={() => { navigator.clipboard.writeText(totpData.secret); toast({ title: 'Copied' }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Separator />
              <div className="px-4 pt-3 pb-1">
                <Label className="text-xs text-muted-foreground">Verification code</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={totpData.verification_code}
                  onChange={(e) => setTotpData(prev => ({ ...prev, verification_code: e.target.value.replace(/\D/g, '') }))}
                  className="border-0 px-0 focus-visible:ring-0 shadow-none text-foreground font-mono text-lg"
                />
              </div>
            </div>

            <Button className="w-full" onClick={verifyTOTP} disabled={totpLoading || totpData.verification_code.length !== 6}>
              {totpLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify & Enable'}
            </Button>
          </div>
        )}

        {totpData.enabled && (
          <div className="space-y-4">
            <div className="border rounded-lg border-border/50 overflow-hidden bg-muted/30">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Two-factor authentication is on</p>
                  <p className="text-xs text-muted-foreground">Your account is protected with TOTP</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg border-border/50 overflow-hidden bg-muted/30">
              <div className="flex items-start gap-3 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Save your recovery codes in a safe place. You'll need them if you lose your authenticator device.
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={disableTOTP} disabled={totpLoading}>
              {totpLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disabling…</> : 'Disable two-factor authentication'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Placeholder dialogs for other items
  const placeholderDialog = (view: SubView, title: string, description: string) => (
    <Dialog open={subView === view} onOpenChange={(open) => !open && setSubView('main')}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={() => setSubView('main')} className="hover:bg-accent rounded-full p-1 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="border rounded-lg border-border/50 overflow-hidden bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground text-sm">This feature is coming soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ListRow = ({ icon: Icon, label, onClick, trailing }: { icon: React.ElementType; label: string; onClick: () => void; trailing?: React.ReactNode }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors text-left">
      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="font-medium text-foreground text-sm flex-1">{label}</span>
      {trailing}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <>
      {changePasswordDialog}
      {twoFactorDialog}
      {placeholderDialog('saved-login', 'Saved login', 'Manage your saved login information for quick access.')}
      {placeholderDialog('passkey', 'Passkey', 'Set up passkeys for a faster, more secure way to sign in.')}
      {placeholderDialog('where-logged-in', "Where you're logged in", 'Review active sessions across your devices.')}
      {placeholderDialog('login-alerts', 'Login alerts', 'Get notified about unrecognized logins to your account.')}
      {placeholderDialog('recent-emails', 'Recent emails', 'Review emails recently sent to your account.')}
      {placeholderDialog('security-checkup', 'Security Checkup', 'Run a comprehensive security check on your account.')}

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Password and security</h2>
          <p className="text-muted-foreground">Manage your passwords, login preferences and recovery methods.</p>
        </div>

        {/* Login & recovery */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Login & recovery</h3>
            <p className="text-sm text-muted-foreground">Manage your passwords, login preferences and recovery methods.</p>
          </div>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <ListRow icon={Key} label="Change password" onClick={() => setSubView('change-password')} />
              <Separator />
              <ListRow icon={Smartphone} label="Two-factor authentication" onClick={() => setSubView('two-factor')} />
              <Separator />
              <ListRow icon={LogIn} label="Saved login" onClick={() => setSubView('saved-login')} />
              <Separator />
              <ListRow icon={Shield} label="Passkey" onClick={() => setSubView('passkey')} />
            </CardContent>
          </Card>
        </div>

        {/* Security checks */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Security checks</h3>
            <p className="text-sm text-muted-foreground">Review security issues by running checks across apps, devices and emails sent.</p>
          </div>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <ListRow icon={Eye} label="Where you're logged in" onClick={() => setSubView('where-logged-in')} />
              <Separator />
              <ListRow icon={Bell} label="Login alerts" onClick={() => setSubView('login-alerts')} />
              <Separator />
              <ListRow icon={Mail} label="Recent emails" onClick={() => setSubView('recent-emails')} />
              <Separator />
              <ListRow icon={ShieldCheck} label="Security Checkup" onClick={() => setSubView('security-checkup')} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PasswordAndSecurity;
