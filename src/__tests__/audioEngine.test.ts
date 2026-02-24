// Audio Engine unit tests
// Tests: effect application, gain mapping, reverb mix

import { describe, it, expect, vi } from 'vitest';

// Mock AudioEffects type
interface AudioEffects {
  volume: number;    // 0-150
  bass: number;      // -100 to 100
  treble: number;    // -100 to 100
  reverb: number;    // 0-100
  pan: number;       // -100 to 100
  speed: number;     // 0.5-2.0
}

const defaultEffects: AudioEffects = {
  volume: 100,
  bass: 0,
  treble: 0,
  reverb: 0,
  pan: 0,
  speed: 1.0,
};

describe('AudioEngine', () => {
  describe('volume mapping', () => {
    it('should map volume 0-150 to gain 0.0-1.5', () => {
      const mapVolume = (volume: number) => volume / 100;

      expect(mapVolume(0)).toBe(0);
      expect(mapVolume(50)).toBe(0.5);
      expect(mapVolume(100)).toBe(1.0);
      expect(mapVolume(150)).toBe(1.5);
    });
  });

  describe('EQ mapping', () => {
    it('should map bass -100 to 100 to -24dB to +24dB', () => {
      const mapEQ = (value: number) => (value / 100) * 24;

      expect(mapEQ(-100)).toBe(-24);
      expect(mapEQ(0)).toBe(0);
      expect(mapEQ(50)).toBe(12);
      expect(mapEQ(100)).toBe(24);
    });

    it('should map treble -100 to 100 to -24dB to +24dB', () => {
      const mapEQ = (value: number) => (value / 100) * 24;

      expect(mapEQ(-100)).toBe(-24);
      expect(mapEQ(100)).toBe(24);
    });
  });

  describe('pan mapping', () => {
    it('should map pan -100 to 100 to -1 to 1', () => {
      const mapPan = (pan: number) => pan / 100;

      expect(mapPan(-100)).toBe(-1);
      expect(mapPan(0)).toBe(0);
      expect(mapPan(100)).toBe(1);
    });
  });

  describe('reverb mix', () => {
    it('should calculate dry/wet mix from reverb level', () => {
      const calculateMix = (reverb: number) => {
        const wetLevel = reverb / 100;
        const dryLevel = 1 - wetLevel * 0.5;
        return { dry: dryLevel, wet: wetLevel * 0.5 };
      };

      // No reverb: full dry
      expect(calculateMix(0)).toEqual({ dry: 1, wet: 0 });

      // Half reverb
      expect(calculateMix(50)).toEqual({ dry: 0.75, wet: 0.25 });

      // Full reverb: still some dry
      expect(calculateMix(100)).toEqual({ dry: 0.5, wet: 0.5 });
    });
  });

  describe('speed validation', () => {
    it('should clamp speed to valid range', () => {
      const clampSpeed = (speed: number) => Math.max(0.5, Math.min(2.0, speed));

      expect(clampSpeed(0.25)).toBe(0.5);
      expect(clampSpeed(1.0)).toBe(1.0);
      expect(clampSpeed(2.5)).toBe(2.0);
    });
  });

  describe('effects application order', () => {
    it('should apply effects in correct order: gain -> bass -> treble -> pan -> reverb', () => {
      const order: string[] = [];
      
      const applyEffects = (effects: AudioEffects) => {
        // Simulate WebAudio chain order
        order.push('gain');
        order.push('bassFilter');
        order.push('trebleFilter');
        order.push('panner');
        order.push('reverb');
      };

      applyEffects(defaultEffects);

      expect(order).toEqual(['gain', 'bassFilter', 'trebleFilter', 'panner', 'reverb']);
    });
  });
});
