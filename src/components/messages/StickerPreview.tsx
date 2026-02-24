import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface StickerPreviewProps {
  sticker: {
    id: string;
    name: string;
    file_url: string;
    pack_name?: string;
  };
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
}

export const StickerPreview: React.FC<StickerPreviewProps> = ({
  sticker,
  onClose,
  onDownload,
  onShare,
  onFavorite
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0 text-center space-y-4">
            {/* Large Sticker Display */}
            <div className="flex justify-center">
              <img
                src={sticker.file_url}
                alt={sticker.name}
                className="w-48 h-48 object-contain rounded-xl"
                loading="lazy"
              />
            </div>
            
            {/* Sticker Info */}
            <div>
              <h3 className="font-semibold text-lg text-foreground">{sticker.name}</h3>
              {sticker.pack_name && (
                <p className="text-sm text-muted-foreground">from {sticker.pack_name}</p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-2">
              {onFavorite && (
                <Button variant="ghost" size="sm" onClick={onFavorite}>
                  <Heart className="h-4 w-4" />
                </Button>
              )}
              {onShare && (
                <Button variant="ghost" size="sm" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button variant="ghost" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Close Button */}
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};