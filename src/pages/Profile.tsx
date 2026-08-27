import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { gateway } from '@/lib/gateway';
import { profilesApi } from '@/api';
import PageContainer from '@/components/PageContainer';
import { Button } from '@/components/ui/button';

// This component redirects to the dynamic profile page. For new accounts the
// profiles row is created lazily (see ensureProfile); without this the page
// would hang on "Loading profile..." forever because .single() on an empty
// result resolves with { data: null, error: null }.
const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      const { data, error: fetchError } = await gateway
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      let username = data?.username as string | undefined;

      if (!username) {
        const created = await profilesApi.ensureProfile({
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        });
        username = created?.username;
      }

      if (username) {
        navigate(`/profile/${username}`, { replace: true });
        return;
      }

      setError("We couldn't find or create your profile. Please try again.");
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError("We couldn't load your profile. Please try again.");
    }
  }, [user, navigate]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (error) {
    return (
      <PageContainer size="sm">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => { setError(null); resolve(); }}>Try again</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <div className="text-center">Loading profile...</div>
    </PageContainer>
  );
};

export default Profile;