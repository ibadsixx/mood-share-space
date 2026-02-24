import { useState, useEffect } from 'react';

export interface StickerGroup {
  label: string;
  folder: string;
}

export interface StickerGroupsConfig {
  [key: string]: StickerGroup;
}

export interface CloudinarySticker {
  public_id: string;
  format: string;
  version: number;
  secure_url: string;
  width: number;
  height: number;
}

export const useCloudinaryStickers = () => {
  const [stickerGroups, setStickerGroups] = useState<StickerGroupsConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CLOUD_NAME = 'dp6cnhdgo';

  const fetchStickerGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to list all resources under the stickers folder to discover categories
      const listUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/stickers.json`;
      const response = await fetch(listUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stickers from Cloudinary');
      }

      const data = await response.json();
      const resources = data.resources || [];
      
      // Extract unique folder names from public_ids
      const folderSet = new Set<string>();
      resources.forEach((resource: any) => {
        const publicId = resource.public_id;
        if (publicId.startsWith('stickers/')) {
          const pathParts = publicId.split('/');
          if (pathParts.length >= 2) {
            const folderName = pathParts[1]; // The folder name after 'stickers/'
            folderSet.add(folderName);
          }
        }
      });

      // Convert folders to groups config
      const groups: StickerGroupsConfig = {};
      folderSet.forEach(folderName => {
        groups[folderName] = {
          label: folderName.charAt(0).toUpperCase() + folderName.slice(1), // Capitalize first letter
          folder: `stickers/${folderName}`
        };
      });

      setStickerGroups(groups);
    } catch (err: any) {
      console.error('Error fetching sticker groups:', err);
      setError(err.message);
      // Fallback to empty groups if discovery fails
      setStickerGroups({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStickerGroups();
  }, []);

  return {
    stickerGroups,
    loading,
    error,
    refetch: fetchStickerGroups
  };
};

export const useCloudinaryGroupStickers = (groupKey: string, folder?: string) => {
  const [stickers, setStickers] = useState<CloudinarySticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace with your actual Cloudinary cloud name
  const CLOUD_NAME = 'dp6cnhdgo';

  const fetchStickers = async () => {
    if (!folder) return;

    try {
      setLoading(true);
      setError(null);

      // Convert folder path to Cloudinary list API format (replace / with .)
      const listPath = folder.replace(/\//g, '.');
      const listUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${listPath}.json`;

      const response = await fetch(listUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch stickers from folder');
      }

      const data = await response.json();
      const stickerList: CloudinarySticker[] = data.resources || [];
      
      // Generate secure URLs for each sticker
      const stickersWithUrls = stickerList.map(sticker => ({
        ...sticker,
        secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_200,h_200,c_fit/${sticker.public_id}.${sticker.format}`
      }));

      setStickers(stickersWithUrls);
    } catch (err: any) {
      console.error('Error fetching stickers:', err);
      setError(err.message);
      setStickers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStickers();
  }, [folder, groupKey]);

  return {
    stickers,
    loading,
    error,
    refetch: fetchStickers
  };
};