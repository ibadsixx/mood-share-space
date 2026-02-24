// Reaction system configuration
// Maps reaction keys to their labels, animated WebP paths, and static icons

export type ReactionKey = 'ok' | 'red_heart' | 'laughing' | 'astonished' | 'cry' | 'rage' | 'hug_face';

export interface ReactionConfig {
  key: ReactionKey;
  label: string;
  webpPath: string; // Animated WebP for picker
  staticIconPath: string; // Static PNG for selected state
  color: string;
}

// Reaction Map - following Facebook/Instagram pattern
export const REACTION_MAP: Record<ReactionKey, ReactionConfig> = {
  ok: {
    key: 'ok',
    label: 'Like',
    webpPath: '/reaction/Ok.webp',
    staticIconPath: '/emoji/1f44c.png',
    color: 'text-primary',
  },
  red_heart: {
    key: 'red_heart',
    label: 'Love',
    webpPath: '/reaction/Red_heart.webp',
    staticIconPath: '/emoji/2764.png',
    color: 'text-primary',
  },
  laughing: {
    key: 'laughing',
    label: 'Haha',
    webpPath: '/reaction/Laughing.webp',
    staticIconPath: '/emoji/1f606.png',
    color: 'text-primary',
  },
  astonished: {
    key: 'astonished',
    label: 'Wow',
    webpPath: '/reaction/Astonished.webp',
    staticIconPath: '/emoji/1f62e.png',
    color: 'text-primary',
  },
  cry: {
    key: 'cry',
    label: 'Sad',
    webpPath: '/reaction/Cry.webp',
    staticIconPath: '/emoji/1f622.png',
    color: 'text-primary',
  },
  rage: {
    key: 'rage',
    label: 'Angry',
    webpPath: '/reaction/Rage.webp',
    staticIconPath: '/emoji/1f621.png',
    color: 'text-primary',
  },
  hug_face: {
    key: 'hug_face',
    label: 'Care',
    webpPath: '/reaction/Hug_face.webp',
    staticIconPath: '/emoji/1f917.png',
    color: 'text-primary',
  },
};

// Ordered array for rendering in picker
export const REACTIONS_LIST: ReactionConfig[] = [
  REACTION_MAP.ok,
  REACTION_MAP.red_heart,
  REACTION_MAP.laughing,
  REACTION_MAP.astonished,
  REACTION_MAP.cry,
  REACTION_MAP.rage,
  REACTION_MAP.hug_face,
];

// Helper to get reaction config by key
export const getReactionConfig = (key: ReactionKey | string): ReactionConfig | null => {
  return REACTION_MAP[key as ReactionKey] || null;
};

// Static icon *paths* for display after selection
export const STATIC_REACTION_ICONS: Record<ReactionKey, string> = {
  ok: REACTION_MAP.ok.staticIconPath,
  red_heart: REACTION_MAP.red_heart.staticIconPath,
  laughing: REACTION_MAP.laughing.staticIconPath,
  astonished: REACTION_MAP.astonished.staticIconPath,
  cry: REACTION_MAP.cry.staticIconPath,
  rage: REACTION_MAP.rage.staticIconPath,
  hug_face: REACTION_MAP.hug_face.staticIconPath,
};

// Get display content for a reaction (static icon + label)
export const getReactionDisplayContent = (reactionKey: ReactionKey | string) => {
  const config = getReactionConfig(reactionKey);
  if (!config) return null;
  
  return {
    iconPath: STATIC_REACTION_ICONS[config.key],
    label: config.label,
    color: config.color,
  };
};
