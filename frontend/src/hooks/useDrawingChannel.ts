import { useEffect, useState, useRef } from 'react';
import * as ActionCable from '@rails/actioncable';

export interface ChannelStatus {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  error: string | null;
}

export interface UseDrawingChannelResult {
  channel: ActionCable.Subscription | null;
  status: ChannelStatus;
}

export const useDrawingChannel = (
  channelName: string,
  drawingId: number | undefined,
  onReceivedData: (data: any) => void
): UseDrawingChannelResult => {
  const [channel, setChannel] = useState<ActionCable.Subscription | null>(null);
  const [status, setStatus] = useState<ChannelStatus>({
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    error: null,
  });
  const consumerRef = useRef<ActionCable.Consumer | null>(null);

  const onReceivedDataRef = useRef(onReceivedData);
  onReceivedDataRef.current = onReceivedData; // 最新のonReceivedDataを保持

  useEffect(() => {
    if (drawingId === undefined) {
      // drawingIdがundefinedの場合はチャネルを購読しない
      setStatus({
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        error: 'Drawing ID is undefined',
      });
      if (channel) {
        channel.unsubscribe();
        setChannel(null);
      }
      return;
    }

    if (!consumerRef.current) {
      const cable = ActionCable.createConsumer(`${import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000'}/cable`);
      consumerRef.current = cable;
    }

    setStatus({ isConnected: false, isConnecting: true, isDisconnected: false, error: null });

    const subscription = consumerRef.current.subscriptions.create(
      { channel: channelName, drawing_id: drawingId },
      {
        initialized: () => console.log('Action Cable channel initialized'),
        connected: () => {
          console.log('Action Cable channel connected');
          setStatus({ isConnected: true, isConnecting: false, isDisconnected: false, error: null });
        },
        disconnected: (reason?: string) => {
          console.log('Action Cable channel disconnected:', reason);
          setStatus({ isConnected: false, isConnecting: false, isDisconnected: true, error: reason || null });
        },
        rejected: () => {
          console.error('Action Cable channel rejected');
          setStatus({ isConnected: false, isConnecting: false, isDisconnected: true, error: 'Channel rejected' });
        },
        received: (data: any) => {
          console.log('Action Cable data received:', data);
          onReceivedDataRef.current(data);
        },
      }
    );

    setChannel(subscription);

    return () => {
      console.log('Action Cable channel unsubscribing...');
      subscription.unsubscribe();
      setStatus({ isConnected: false, isConnecting: false, isDisconnected: true, error: null });
    };
  }, [channelName, drawingId]);

  return { channel, status };
};
