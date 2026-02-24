// Editor History (Undo/Redo) unit tests
// Tests: snapshot push, undo, redo, stack limits

import { describe, it, expect, beforeEach } from 'vitest';

interface EditorSnapshot {
  action: string;
  timestamp: number;
  videoLayers: any[];
  textLayers: any[];
}

// Simplified history manager for testing
class EditorHistory {
  private undoStack: EditorSnapshot[] = [];
  private redoStack: EditorSnapshot[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  push(snapshot: Omit<EditorSnapshot, 'timestamp'>): void {
    const fullSnapshot: EditorSnapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };
    
    this.undoStack.push(fullSnapshot);
    
    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack on new action
    this.redoStack = [];
  }

  undo(): EditorSnapshot | null {
    if (this.undoStack.length <= 1) return null;
    
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  redo(): EditorSnapshot | null {
    if (this.redoStack.length === 0) return null;
    
    const snapshot = this.redoStack.pop()!;
    this.undoStack.push(snapshot);
    
    return snapshot;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number {
    return Math.max(0, this.undoStack.length - 1);
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}

describe('EditorHistory', () => {
  let history: EditorHistory;

  beforeEach(() => {
    history = new EditorHistory();
  });

  describe('push', () => {
    it('should add snapshot to undo stack', () => {
      history.push({
        action: 'Initial',
        videoLayers: [],
        textLayers: [],
      });

      expect(history.getUndoCount()).toBe(0); // First snapshot is baseline
    });

    it('should clear redo stack on new push', () => {
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      history.push({ action: 'B', videoLayers: [], textLayers: [] });
      history.undo();
      
      expect(history.canRedo()).toBe(true);
      
      history.push({ action: 'C', videoLayers: [], textLayers: [] });
      
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('undo', () => {
    it('should return previous snapshot', () => {
      history.push({ action: 'A', videoLayers: [{ id: 1 }], textLayers: [] });
      history.push({ action: 'B', videoLayers: [{ id: 2 }], textLayers: [] });

      const result = history.undo();
      
      expect(result?.action).toBe('A');
      expect(result?.videoLayers).toEqual([{ id: 1 }]);
    });

    it('should return null when at initial state', () => {
      history.push({ action: 'Initial', videoLayers: [], textLayers: [] });
      
      expect(history.undo()).toBeNull();
    });

    it('should move snapshot to redo stack', () => {
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      history.push({ action: 'B', videoLayers: [], textLayers: [] });
      
      history.undo();
      
      expect(history.canRedo()).toBe(true);
      expect(history.getRedoCount()).toBe(1);
    });
  });

  describe('redo', () => {
    it('should restore undone snapshot', () => {
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      history.push({ action: 'B', videoLayers: [{ id: 'b' }], textLayers: [] });
      
      history.undo();
      const result = history.redo();
      
      expect(result?.action).toBe('B');
      expect(result?.videoLayers).toEqual([{ id: 'b' }]);
    });

    it('should return null when no redo available', () => {
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      
      expect(history.redo()).toBeNull();
    });
  });

  describe('stack limits', () => {
    it('should limit undo stack size', () => {
      const smallHistory = new EditorHistory(5);
      
      for (let i = 0; i < 10; i++) {
        smallHistory.push({ action: `Action ${i}`, videoLayers: [], textLayers: [] });
      }
      
      // Should only have 5 items (4 undoable + 1 current)
      expect(smallHistory.getUndoCount()).toBe(4);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should correctly report undo availability', () => {
      expect(history.canUndo()).toBe(false);
      
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      expect(history.canUndo()).toBe(false);
      
      history.push({ action: 'B', videoLayers: [], textLayers: [] });
      expect(history.canUndo()).toBe(true);
    });

    it('should correctly report redo availability', () => {
      history.push({ action: 'A', videoLayers: [], textLayers: [] });
      history.push({ action: 'B', videoLayers: [], textLayers: [] });
      
      expect(history.canRedo()).toBe(false);
      
      history.undo();
      expect(history.canRedo()).toBe(true);
    });
  });
});
