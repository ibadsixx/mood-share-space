# @Mentions Feature

## Overview
The @mentions feature allows users to tag other users in posts and comments by typing `@username`. Mentions are automatically detected, stored in the database, and rendered as clickable links to user profiles.

## Implementation

### Database Schema
```sql
-- mentions table tracks all @username mentions
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('post', 'comment')),
  source_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Components

#### 1. `useMentions` Hook (`src/hooks/useMentions.ts`)
Provides functions for:
- **extractMentions(text)**: Extracts all @username mentions from text using regex
- **getUserIdsFromUsernames(usernames)**: Fetches user IDs from usernames
- **saveMentions(sourceType, sourceId, text)**: Saves mentions to database
- **getMentions(sourceType, sourceId)**: Retrieves mentions for a post/comment

#### 2. `MentionText` Component (`src/components/MentionText.tsx`)
Renders text with mentions as clickable links:
```tsx
<MentionText text="Hey @john, check this out!" />
// Renders: Hey <Link to="/profile/john">@john</Link>, check this out!
```

#### 3. `MentionAutocomplete` Component
Shows friend suggestions when typing @ in text inputs (already existed, now integrated).

### Usage in Posts

```tsx
// In NewPost.tsx
const handleSubmit = async () => {
  const postId = await onCreatePost?.(...);
  if (postId) {
    await saveMentions('post', postId, content);
  }
};

// In Post.tsx (display)
<MentionText text={content} />
```

### Usage in Comments

```tsx
// In useComments.ts
const addComment = async (content: string) => {
  const { data } = await supabase.from('comments').insert({...}).select().single();
  await saveMentions('comment', data.id, content);
};

// In CommentItem.tsx (display)
<MentionText text={comment.content} />
```

## Features

### Autocomplete
- Type `@` in any post or comment input
- Shows dropdown of friends to mention
- Click or press Enter to select

### Link Rendering
- All `@username` mentions automatically become clickable links
- Links navigate to user's profile page
- Prevents event bubbling (won't trigger post click when clicking mention)

### Database Tracking
- All mentions saved to `mentions` table
- Enables future features like:
  - Mention notifications
  - "Who mentioned me" feed
  - Mention analytics

## Security

- RLS policies ensure:
  - Only authenticated users can create mentions
  - Users can only create mentions for their own content
  - All authenticated users can view mentions

## Future Enhancements

1. **Notifications**: Notify users when they're mentioned
2. **Mention Count**: Show count of mentions in notification bell
3. **Mention Feed**: Dedicated page showing all mentions of current user
4. **Privacy Settings**: Allow users to control who can mention them
5. **Hashtags**: Similar system for #hashtag tracking
