// Undo/Redo history stack for editor actions
// Stores snapshots of editor state for transaction-safe undo/redo

import { useState, useCallback, useRef } from 'react';
import { VideoLayer, AudioTrack, EmojiLayer, TextLayer, ImageLayer, VideoFilter, Transcript } from '@/types/editor';

export interface EditorSnapshot {
  timestamp: number;
  action: string;
  videoLayers: VideoLayer[];
  audioTrack: AudioTrack | null;
  emojiLayers: EmojiLayer[];
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  globalFilter: VideoFilter;
  duration: number;
  clipStart: number;
  clipEnd: number;
  transcript: Transcript | null;
}

interface UseEditorHistoryOptions {
  maxHistory?: number;
}

export function useEditorHistory(options: UseEditorHistoryOptions = {}) {
  const { maxHistory = 50 } = options;
  
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const lastSnapshotRef = useRef<string>('');

  // Push a new snapshot to history
  const pushSnapshot = useCallback((snapshot: Omit<EditorSnapshot, 'timestamp'>) => {
    // Create hash of snapshot to avoid duplicates
    const hash = JSON.stringify({
      videoLayers: snapshot.videoLayers.map(v => ({ id: v.id, start: v.start, end: v.end })),
      audioTrack: snapshot.audioTrack?.id,
      emojiLayers: snapshot.emojiLayers.map(e => ({ id: e.id, position: e.position })),
      textLayers: snapshot.textLayers.map(t => ({ id: t.id, content: t.content, position: t.position })),
      imageLayers: snapshot.imageLayers.map(i => ({ id: i.id, position: i.position })),
      duration: snapshot.duration,
    });

    if (hash === lastSnapshotRef.current) {
      console.log('[History] Skipping duplicate snapshot');
      return;
    }

    lastSnapshotRef.current = hash;

    const newSnapshot: EditorSnapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };

    setUndoStack(prev => {
      const newStack = [...prev, newSnapshot];
      // Limit stack size
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });

    // Clear redo stack on new action
    setRedoStack([]);

    console.log(`[History] Pushed: "${snapshot.action}" (${undoStack.length + 1} items)`);
  }, [maxHistory, undoStack.length]);

  // Undo last action - returns the previous state
  const undo = useCallback((): EditorSnapshot | null => {
    if (undoStack.length < 2) {
      console.log('[History] Nothing to undo');
      return null;
    }

    // Pop current state and push to redo
    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, current]);

    console.log(`[History] Undo: "${current.action}" → restored previous state`);
    
    // Update last snapshot ref to avoid re-pushing
    lastSnapshotRef.current = JSON.stringify({
      videoLayers: previous.videoLayers.map(v => ({ id: v.id, start: v.start, end: v.end })),
      audioTrack: previous.audioTrack?.id,
      emojiLayers: previous.emojiLayers.map(e => ({ id: e.id, position: e.position })),
      textLayers: previous.textLayers.map(t => ({ id: t.id, content: t.content, position: t.position })),
      imageLayers: previous.imageLayers.map(i => ({ id: i.id, position: i.position })),
      duration: previous.duration,
    });

    return previous;
  }, [undoStack]);

  // Redo last undone action
  const redo = useCallback((): EditorSnapshot | null => {
    if (redoStack.length === 0) {
      console.log('[History] Nothing to redo');
      return null;
    }

    const toRedo = redoStack[redoStack.length - 1];

    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, toRedo]);

    console.log(`[History] Redo: "${toRedo.action}"`);
    
    // Update last snapshot ref
    lastSnapshotRef.current = JSON.stringify({
      videoLayers: toRedo.videoLayers.map(v => ({ id: v.id, start: v.start, end: v.end })),
      audioTrack: toRedo.audioTrack?.id,
      emojiLayers: toRedo.emojiLayers.map(e => ({ id: e.id, position: e.position })),
      textLayers: toRedo.textLayers.map(t => ({ id: t.id, content: t.content, position: t.position })),
      imageLayers: toRedo.imageLayers.map(i => ({ id: i.id, position: i.position })),
      duration: toRedo.duration,
    });

    return toRedo;
  }, [redoStack]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    lastSnapshotRef.current = '';
    console.log('[History] Cleared');
  }, []);

  // Get recent actions for UI display
  const getRecentActions = useCallback((count: number = 5): string[] => {
    return undoStack.slice(-count).map(s => s.action).reverse();
  }, [undoStack]);

  return {
    pushSnapshot,
    undo,
    redo,
    clearHistory,
    canUndo: undoStack.length >= 2,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length - 1,
    redoCount: redoStack.length,
    getRecentActions,
  };
}
