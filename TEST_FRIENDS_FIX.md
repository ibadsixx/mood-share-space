# Friends Load Fix - Verification Guide

## Root Cause
The `friends` table was missing foreign key constraints to the `profiles` table, causing the nested select query in `useFriends.ts` to fail silently.

## Changes Applied

### 1. Database Migration (✅ Complete)
Added foreign key constraints:
```sql
ALTER TABLE public.friends
  ADD CONSTRAINT friends_requester_id_fkey 
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.friends
  ADD CONSTRAINT friends_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### 2. Code Improvements (✅ Complete)
Enhanced `src/hooks/useFriends.ts`:
- Added detailed error logging with Supabase error details
- Added null-safety checks for profile data
- Improved error messages showing actual error details
- Added debug logging for troubleshooting

## Verification Steps

### Step 1: Verify Database (✅ Confirmed)
```sql
-- Check foreign keys exist
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint
WHERE conrelid = 'public.friends'::regclass 
  AND contype = 'f';
```
Expected: Should show `friends_requester_id_fkey` and `friends_receiver_id_fkey`

### Step 2: Test with Sample Data
```sql
-- Insert test profiles (if not exist)
INSERT INTO profiles (id, username, display_name)
VALUES 
  ('test-user-1', 'user1', 'Test User 1'),
  ('test-user-2', 'user2', 'Test User 2')
ON CONFLICT (id) DO NOTHING;

-- Create test friendship
INSERT INTO friends (requester_id, receiver_id, status)
VALUES ('test-user-1', 'test-user-2', 'accepted')
ON CONFLICT (requester_id, receiver_id) DO NOTHING;

-- Verify nested select works
SELECT 
  f.*,
  rp.username as requester_username,
  rep.username as receiver_username
FROM friends f
JOIN profiles rp ON rp.id = f.requester_id
JOIN profiles rep ON rep.id = f.receiver_id
WHERE f.status = 'accepted';
```

### Step 3: Test in UI
1. Navigate to a user profile
2. Click on "Friends" tab
3. Check browser console for debug logs:
   - `[useFriends] Fetching friends for user: {userId}`
   - `[useFriends] Raw data received: {count} friendships`
   - `[useFriends] Processed friends: {count}`

4. If error occurs, console will show:
   - Detailed Supabase error with code/message/details
   - Toast notification with specific error message

### Step 4: Test Components Using useFriends
The following components use `useFriends` hook:
- `FamilyMembersSection.tsx`
- `MentionAutocomplete.tsx`
- `OverviewSection.tsx`
- `TagPeopleModal.tsx`
- `SendPostModal.tsx`

Test each by:
1. Opening the component
2. Checking console for errors
3. Verifying friends list displays correctly

## Rollback (if needed)
```sql
-- Remove foreign keys
ALTER TABLE public.friends DROP CONSTRAINT IF EXISTS friends_requester_id_fkey;
ALTER TABLE public.friends DROP CONSTRAINT IF EXISTS friends_receiver_id_fkey;
```

Then revert code changes in `src/hooks/useFriends.ts` using git:
```bash
git checkout HEAD -- src/hooks/useFriends.ts
```

## Common Issues & Solutions

### Issue: "Failed to load friends: permission denied for table profiles"
**Solution**: Check RLS policies on profiles table
```sql
-- Ensure authenticated users can read profiles
CREATE POLICY IF NOT EXISTS "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (NOT is_blocked(auth.uid(), id));
```

### Issue: "Failed to load friends: relation does not exist"
**Solution**: Verify migration ran successfully in Supabase dashboard

### Issue: Empty friends list when friends exist
**Solution**: Check friend status is 'accepted' (lowercase) not 'ACCEPTED'
```sql
SELECT status, count(*) FROM friends GROUP BY status;
```

## Expected Behavior
- ✅ No "Failed to load friend" errors
- ✅ Friends list loads successfully
- ✅ Detailed error messages if issues occur
- ✅ Console logs show query execution
- ✅ Null profiles handled gracefully

## Debug Mode
To enable detailed logging, open browser console and run:
```javascript
localStorage.setItem('debug', 'useFriends:*');
```

Then refresh and reproduce the issue.
