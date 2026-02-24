import { useCallback, useRef, useEffect, useState } from 'react';
import { ConnectionQuality, initialConnectionQuality } from './types';

interface UseConnectionQualityOptions {
  peerConnection: RTCPeerConnection | null;
  isConnected: boolean;
}

export const useConnectionQuality = ({ peerConnection, isConnected }: UseConnectionQualityOptions) => {
  const [quality, setQuality] = useState<ConnectionQuality>(initialConnectionQuality);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatsRef = useRef<{
    packetsLost: number;
    packetsReceived: number;
    timestamp: number;
  } | null>(null);

  const calculateQualityLevel = useCallback((packetLoss: number, rtt: number, jitter: number): ConnectionQuality['level'] => {
    // Quality thresholds based on WebRTC standards
    if (packetLoss < 1 && rtt < 100 && jitter < 30) return 'excellent';
    if (packetLoss < 3 && rtt < 200 && jitter < 50) return 'good';
    if (packetLoss < 8 && rtt < 400 && jitter < 100) return 'fair';
    return 'poor';
  }, []);

  const collectStats = useCallback(async () => {
    if (!peerConnection) return;

    try {
      const stats = await peerConnection.getStats();
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;
      let roundTripTime = 0;
      let jitter = 0;
      let hasInboundRtp = false;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.kind === 'video')) {
          hasInboundRtp = true;
          totalPacketsLost += report.packetsLost || 0;
          totalPacketsReceived += report.packetsReceived || 0;
          if (report.jitter) {
            jitter = Math.max(jitter, report.jitter * 1000); // Convert to ms
          }
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime) {
            roundTripTime = report.currentRoundTripTime * 1000; // Convert to ms
          }
        }
      });

      if (!hasInboundRtp) return;

      // Calculate packet loss percentage over time
      let packetLoss = 0;
      if (previousStatsRef.current) {
        const lostDiff = totalPacketsLost - previousStatsRef.current.packetsLost;
        const receivedDiff = totalPacketsReceived - previousStatsRef.current.packetsReceived;
        if (receivedDiff > 0) {
          packetLoss = (lostDiff / (receivedDiff + lostDiff)) * 100;
        }
      }

      previousStatsRef.current = {
        packetsLost: totalPacketsLost,
        packetsReceived: totalPacketsReceived,
        timestamp: Date.now(),
      };

      const level = calculateQualityLevel(packetLoss, roundTripTime, jitter);

      setQuality({
        level,
        packetLoss: Math.round(packetLoss * 100) / 100,
        roundTripTime: Math.round(roundTripTime),
        jitter: Math.round(jitter),
      });
    } catch (error) {
      console.error('[Quality] Error collecting stats:', error);
    }
  }, [peerConnection, calculateQualityLevel]);

  useEffect(() => {
    if (isConnected && peerConnection) {
      // Start collecting stats every 2 seconds
      statsIntervalRef.current = setInterval(collectStats, 2000);
      // Initial collection
      collectStats();
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      previousStatsRef.current = null;
      setQuality(initialConnectionQuality);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isConnected, peerConnection, collectStats]);

  return quality;
};
