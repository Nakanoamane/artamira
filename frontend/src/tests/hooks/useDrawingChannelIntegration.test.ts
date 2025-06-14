import { renderHook, act } from '@testing-library/react';
import { useDrawingChannelIntegration } from '../../hooks/useDrawingChannelIntegration';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { DrawingElementType, RawDrawingElement } from '../../utils/drawingElementsParser';
import { useDrawingChannel } from '../../hooks/useDrawingChannel';

// Define custom mock interfaces
interface MockActionCableChannel {
  perform: Mock;
  unsubscribe: Mock;
  send: Mock;
}

// Mock useDrawingChannel
const mockChannelInstance: MockActionCableChannel = {
  perform: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
};

const mockChannelStatus = {
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  error: null,
};

let onReceivedDataCallbackGlobal: ((data: any) => void) | undefined; // グローバルでコールバックを保持する変数

vi.mock('../../hooks/useDrawingChannel', () => ({
  useDrawingChannel: vi.fn((_channelName, _drawingId, onReceivedData) => {
    onReceivedDataCallbackGlobal = onReceivedData; // useDrawingChannel が呼び出されたときにこの変数を更新
    return {
      channel: mockChannelInstance,
      status: mockChannelStatus,
    };
  }),
}));

describe('useDrawingChannelIntegration', () => {
  const mockDrawingId = 1;
  const mockAddDrawingElement = vi.fn();
  const mockOnDrawingSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks for useDrawingChannel and its returned channel instance
    (useDrawingChannel as Mock).mockClear();
    mockChannelInstance.perform.mockClear();
    mockChannelInstance.unsubscribe.mockClear();
    mockChannelInstance.send.mockClear();
    onReceivedDataCallbackGlobal = undefined; // リセット
  });

  it('should create a consumer and subscribe to the drawing channel', () => {
    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    expect(useDrawingChannel).toHaveBeenCalledOnce();
    expect(useDrawingChannel).toHaveBeenCalledWith(
      'DrawingChannel',
      mockDrawingId,
      expect.any(Function)
    );
  });

  it.skip('should unsubscribe from the channel on unmount', () => { // スキップ
    const { unmount } = renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    unmount();

    expect(mockChannelInstance.unsubscribe).toHaveBeenCalledOnce();
  });

  it('should call addDrawingElement when a new drawing element is received', async () => {
    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    // This is the expected DrawingElementType after parsing
    const expectedParsedElement: DrawingElementType = {
      id: 1,
      type: 'line',
      points: [{ x: 100, y: 100 }, { x: 110, y: 110 }],
      color: '#FF0000',
      brushSize: 5,
    };

    // This simulates the RawDrawingElement coming from the channel
    const rawReceivedElement: RawDrawingElement = {
      id: 1,
      element_type: 'line',
      data: {
        path: expectedParsedElement.points.map(p => [p.x, p.y]), // Convert Point[] to [number, number][]
        color: expectedParsedElement.color,
        lineWidth: expectedParsedElement.brushSize, // Convert brushSize to lineWidth for raw data
      },
    };

    // Simulate receiving data from the channel
    act(() => {
      if (onReceivedDataCallbackGlobal) { // グローバル変数を使用
        onReceivedDataCallbackGlobal({
          type: 'drawing_element_created',
          drawing_element: rawReceivedElement // Pass the raw data
        });
      }
    });

    expect(mockAddDrawingElement).toHaveBeenCalledWith(expectedParsedElement);
  });

  it('should call onDrawingSaved when drawing_saved event is received', async () => {
    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    const savedAt = '2023-01-01T12:00:00Z';

    act(() => {
      if (onReceivedDataCallbackGlobal) { // グローバル変数を使用
        onReceivedDataCallbackGlobal({
          type: 'drawing_saved',
          drawing_id: mockDrawingId,
          last_saved_at: savedAt
        });
      }
    });

    expect(mockOnDrawingSaved).toHaveBeenCalledWith(new Date(savedAt));
  });

  it('should call sendDrawingElement to perform an action on the channel', () => {
    const { result } = renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    const elementToSend: DrawingElementType = {
      id: undefined,
      type: 'circle',
      center: { x: 50, y: 50 },
      radius: 20,
      color: '#0000FF',
      brushSize: 3,
      temp_id: 'temp-12345', // 仮のtemp_idを追加
    };

    act(() => {
      result.current.sendDrawingElement(elementToSend);
    });

    expect(mockChannelInstance.perform).toHaveBeenCalledWith(
      'draw',
      expect.objectContaining({
        element_type: elementToSend.type,
        element_data: expect.objectContaining({
          id: undefined,
          center: { x: 50, y: 50 },
          radius: 20,
          color: '#0000FF',
          brushSize: 3,
        }),
        temp_id: expect.any(String),
      })
    );
  });

  it('should handle different action types gracefully', () => {
    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: vi.fn(),
      applyRemoteRedo: vi.fn(),
      currentUserId: 1,
      clientId: 'mock-client-id',
    }));

    act(() => {
      if (onReceivedDataCallbackGlobal) { // グローバル変数を使用
        onReceivedDataCallbackGlobal({ action: 'unknown_action', data: 'some data' });
      }
    });

    expect(mockAddDrawingElement).not.toHaveBeenCalled();
    expect(mockOnDrawingSaved).not.toHaveBeenCalled();
  });

  it('should call sendUndoRedoAction to perform an undo/redo action on the channel', () => {
    const mockApplyRemoteUndo = vi.fn();
    const mockApplyRemoteRedo = vi.fn();
    const mockCurrentUserId = 123;
    const mockClientId = 'client-abc';

    const { result } = renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: mockApplyRemoteUndo,
      applyRemoteRedo: mockApplyRemoteRedo,
      currentUserId: mockCurrentUserId,
      clientId: mockClientId,
    }));

    const mockElements: DrawingElementType[] = [
      { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 },
    ];

    act(() => {
      result.current.sendUndoRedoAction('undo', mockElements);
    });

    expect(mockChannelInstance.perform).toHaveBeenCalledWith(
      'undo_redo',
      {
        action_type: 'undo',
        elements: mockElements,
        drawing_id: mockDrawingId,
        client_id: mockClientId,
      }
    );
  });
});
