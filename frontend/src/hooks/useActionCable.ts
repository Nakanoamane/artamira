import { useEffect, useState } from 'react'
import { createConsumer } from '@rails/actioncable'

export interface DrawingData {
  start: { x: number; y: number }
  end: { x: number; y: number }
  color: string
  brushSize: number
}

export interface ConnectionStatus {
  isConnected: boolean
  error: string | null
}

export interface ActionCableChannel {
  perform: (action: string, data: any) => void
  received: (data: DrawingData) => void
  unsubscribe: () => void
}

export interface ActionCableHook {
  channel: ActionCableChannel | null
  status: ConnectionStatus
  receivedData: DrawingData | null
}

const consumer = createConsumer(`${import.meta.env.VITE_API_URL}/cable`)

export const useActionCable = (channelName: string): ActionCableHook => {
  const [channel, setChannel] = useState<ActionCableChannel | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    error: null,
  })
  const [receivedData, setReceivedData] = useState<DrawingData | null>(null)

  useEffect(() => {
    const subscription = consumer.subscriptions.create(
      channelName,
      {
        connected() {
          setStatus({ isConnected: true, error: null })
        },
        disconnected() {
          setStatus({ isConnected: false, error: null })
        },
        received(data: DrawingData) {
          setReceivedData(data)
        },
        rejected() {
          setStatus({
            isConnected: false,
            error: '接続が拒否されました',
          })
        },
      }
    )

    setChannel(subscription as ActionCableChannel)

    return () => {
      subscription.unsubscribe()
    }
  }, [channelName])

  return { channel, status, receivedData }
}
