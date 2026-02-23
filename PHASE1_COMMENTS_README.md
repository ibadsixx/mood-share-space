# Phase 1 Comments System - Implementation Guide

## Overview
This Phase 1 implementation adds:
- ✅ Real user profile images in comments
- ✅ Inline comment editing with "(edited)" label
- ✅ Basic emoji reactions (❤️ 👍 😆 😮 😢 😡)
- ✅ Supabase backend with RLS policies
- ✅ Real-time updates for comments and reactions

## Database Setup

### Tables Created
1. **comments** (updated)
   - Added `updated_at` field with auto-update trigger
   
2. **comment_reactions** (new)
   - Stores emoji reactions from users
   - Unique constraint: one reaction per user per emoji per comment

### Row-Level Security (RLS)
- Comments: Users can only edit/delete their own comments
- Reactions: Users can only delete their own reactions
- All authenticated users can insert comments and reactions
- Everyone can view comments and reactions

### Migrations Applied
The following migrations have been executed:
- ✅ Added `updated_at` column to comments table
- ✅ Created trigger for auto-updating `updated_at`
- ✅ Created `comment_reactions` table with RLS policies
- ✅ Added performance indexes

## Frontend Components

### New Components
1. **CommentItem** (`src/components/CommentItem.tsx`)
   - Displays individual comment with profile image
   - Inline editing with save/cancel
   - Shows "(edited)" label when comment is updated
   - Owner menu with edit/delete options

2. **CommentReactions** (`src/components/CommentReactions.tsx`)
   - Reaction emoji buttons (❤️ 👍 😆 😮 😢 😡)
   - Shows reaction counts
   - Highlights user's active reactions
   - Expandable to show all emojis

### Updated Files
1. **useComments** hook (`src/hooks/useComments.ts`)
   - Added `editComment()` function
   - Added `toggleReaction()` function
   - Enhanced to fetch reactions with comments
   - Real-time subscriptions for reactions

2. **Post** component (`src/components/Post.tsx`)
   - Now uses CommentItem component for rendering
   - Passes edit/delete/reaction handlers to CommentItem

## Testing Guide

### Prerequisites
- Supabase project configured
- Environment variables set (SUPABASE_URL, SUPABASE_ANON_KEY)
- User authentication working

### Test Cases

#### 1. Profile Images
- ✅ Comment input shows current user's avatar
- ✅ Each comment shows author's profile image
- ✅ Fallback to `/default-avatar.png` if no image set
- ✅ Avatar is clickable → navigates to user profile

#### 2. Edit Comments
- ✅ Owner sees edit button (three dots menu)
- ✅ Clicking edit shows inline textarea
- ✅ Can save changes (content updates)
- ✅ Can cancel editing (reverts to original)
- ✅ "(edited)" label appears after saving
- ✅ Non-owners don't see edit button

#### 3. Delete Comments
- ✅ Owner sees delete button in menu
- ✅ Clicking delete removes comment
- ✅ Non-owners cannot delete (blocked by RLS)

#### 4. Reactions
- ✅ All 6 emoji buttons render below comment
- ✅ Clicking emoji adds reaction (count increases)
- ✅ Clicking same emoji removes reaction (count decreases)
- ✅ User's active reactions are highlighted
- ✅ Multiple users can react with same emoji
- ✅ Reaction counts update in real-time

#### 5. Real-time Updates
- ✅ New comments appear instantly for all users
- ✅ Reactions update live across sessions
- ✅ Deleted comments disappear for everyone

### Manual Testing Steps

1. **Create a comment**
   ```
   - Log in as User A
   - Navigate to a post
   - Type a comment and submit
   - Verify your avatar appears next to input
   ```

2. **Edit a comment**
   ```
   - Click three dots on your comment
   - Select "Edit"
   - Change the text
   - Click "Save"
   - Verify "(edited)" label appears
   ```

3. **Add reactions**
   ```
   - Click a reaction emoji (e.g., ❤️)
   - Verify count increases and button highlights
   - Click same emoji again
   - Verify count decreases and highlight removes
   ```

4. **Test RLS (Security)**
   ```
   - Log in as User B
   - Try to edit User A's comment
   - Verify edit button doesn't appear
   - Verify direct API calls are blocked by Supabase RLS
   ```

5. **Real-time sync**
   ```
   - Open app in two browsers (User A and User B)
   - User A posts a comment
   - Verify User B sees it appear instantly
   - User B adds a reaction
   - Verify User A sees count update live
   ```

## API Functions

### useComments Hook
```typescript
const {
  comments,           // Array of comments with reactions
  loading,           // Initial load state
  submitting,        // Comment submission state
  addComment,        // (content, postOwnerId) => Promise<boolean>
  editComment,       // (commentId, newContent) => Promise<boolean>
  deleteComment,     // (commentId) => Promise<void>
  toggleReaction,    // (commentId, emoji) => Promise<void>
  refetch            // () => Promise<void>
} = useComments(postId);
```

### Usage Example
```tsx
import { useComments } from '@/hooks/useComments';
import { CommentItem } from '@/components/CommentItem';

function PostComments({ postId }) {
  const { comments, addComment, editComment, deleteComment, toggleReaction } = useComments(postId);

  return (
    <div>
      {comments.map((comment, index) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          index={index}
          onEdit={editComment}
          onDelete={deleteComment}
          onToggleReaction={toggleReaction}
        />
      ))}
    </div>
  );
}
```

## Security Notes

### RLS Policies Applied
- ✅ Users can only update their own comments
- ✅ Users can only delete their own comments
- ✅ Users can only delete their own reactions
- ✅ Authentication required for all mutations
- ✅ Read access is public (for viewing)

### Best Practices
- All user inputs are validated
- Profile images use fallback for missing avatars
- Real-time subscriptions properly cleaned up
- Optimistic UI updates with error rollback

## Known Limitations (Phase 1)

Phase 2 features not yet implemented:
- ❌ Threaded replies (nesting)
- ❌ @mentions with autocomplete
- ❌ #hashtags linking
- ❌ Rich text formatting
- ❌ Image attachments in comments

## Troubleshooting

### Issue: Comments don't load
- Check Supabase connection in browser console
- Verify RLS policies are enabled
- Check network tab for API errors

### Issue: Reactions don't update
- Verify user is authenticated
- Check `comment_reactions` table exists
- Inspect real-time subscription in console

### Issue: "(edited)" doesn't appear
- Verify `updated_at` field exists on comments table
- Check trigger is active: `update_comments_timestamp`
- Test by editing a comment and checking `updated_at` in Supabase dashboard

### Issue: Profile images don't show
- Check `profiles.profile_pic` field is populated
- Verify fallback image exists at `/default-avatar.png`
- Check image URLs are accessible

## Next Steps (Phase 2)

Future enhancements to implement:
1. Reply threading (nested comments)
2. @mention system with autocomplete
3. #hashtag detection and linking
4. Comment sorting options
5. Load more pagination
6. Comment notifications

## Support

For issues or questions:
- Check Supabase logs for backend errors
- Inspect browser console for frontend errors
- Review RLS policies in Supabase dashboard
- Test with different user accounts for permissions
