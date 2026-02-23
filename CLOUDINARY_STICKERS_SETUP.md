# Cloudinary Stickers Setup Guide

## Step 1: Configure Your Cloudinary Account

1. **Update the Cloud Name** in `src/hooks/useCloudinaryStickers.ts`:
   ```typescript
   const CLOUD_NAME = 'your-actual-cloud-name'; // Replace with your Cloudinary cloud name
   ```

## Step 2: Create Sticker Groups JSON File

1. Create a file called `sticker_groups.json` and upload it to your Cloudinary account at the root level.

2. **Example content for `sticker_groups.json`:**
   ```json
   {
     "people": { 
       "label": "People", 
       "folder": "stickers/people" 
     },
     "animals": { 
       "label": "Animals", 
       "folder": "stickers/animals" 
     },
     "cars": { 
       "label": "Cars", 
       "folder": "stickers/cars" 
     },
     "gym": { 
       "label": "Gym", 
       "folder": "stickers/gym" 
     },
     "emojis": { 
       "label": "Emojis", 
       "folder": "stickers/emojis" 
     }
   }
   ```

## Step 3: Upload Stickers to Cloudinary

1. **Create folders** in your Cloudinary account:
   - `stickers/people/`
   - `stickers/animals/`
   - `stickers/cars/`
   - `stickers/gym/`
   - etc.

2. **Upload sticker images** to each respective folder:
   - Upload `.png`, `.jpg`, `.gif`, or `.webp` files
   - Images will be automatically resized to 200x200px for display

## Step 4: Enable Cloudinary List API (Important!)

**You MUST enable the List API in your Cloudinary account for this to work:**

1. Go to your [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings → Security → Media Delivery**
3. Find **"Resource List"** section
4. **Enable "List resources" API**
5. Save the settings

## Step 5: Test Your Setup

1. Go to the Messages page in your app
2. Click the Sticker button (sticker icon)
3. You should see tabs for each group from your `sticker_groups.json`
4. Click a tab to load stickers from that Cloudinary folder
5. Click a sticker to send it in the conversation

## URL Format Examples

- **Groups JSON**: `https://res.cloudinary.com/YOUR-CLOUD-NAME/raw/upload/sticker_groups.json`
- **Sticker List**: `https://res.cloudinary.com/YOUR-CLOUD-NAME/image/list/stickers.people.json`
- **Sticker Image**: `https://res.cloudinary.com/YOUR-CLOUD-NAME/image/upload/f_auto,q_auto,w_200,h_200,c_fit/stickers/people/happy.png`

## Adding New Sticker Groups

1. Upload new stickers to a new folder (e.g., `stickers/sports/`)
2. Update your `sticker_groups.json` file:
   ```json
   {
     "sports": { 
       "label": "Sports", 
       "folder": "stickers/sports" 
     }
   }
   ```
3. Re-upload the updated JSON file to Cloudinary
4. The app will automatically detect the new group on next load!

## Troubleshooting

- **No stickers showing**: Check if List API is enabled in Cloudinary settings
- **Groups not loading**: Verify your `sticker_groups.json` URL is accessible
- **Images not displaying**: Check folder paths match exactly in your JSON config
- **CORS errors**: Make sure your domain is whitelisted in Cloudinary settings