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

// グローバル変数ではなく、テストごとにモックの呼び出しから直接コールバックを取得するように変更
vi.mock('../../hooks/useDrawingChannel', () => ({
  useDrawingChannel: vi.fn((_channelName, _drawingId, onReceivedData) => {
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

    // Get the onReceivedData callback from the mock
    const onReceivedData = (useDrawingChannel as Mock).mock.calls[0][2];

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
      onReceivedData({
        type: 'drawing_element_created',
        drawing_element: rawReceivedElement // Pass the raw data
      });
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

    // Get the onReceivedData callback from the mock
    const onReceivedData = (useDrawingChannel as Mock).mock.calls[0][2];

    const savedAt = '2023-01-01T12:00:00Z';

    act(() => {
      onReceivedData({
        type: 'drawing_saved',
        drawing_id: mockDrawingId,
        last_saved_at: savedAt
      });
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

    // Get the onReceivedData callback from the mock
    const onReceivedData = (useDrawingChannel as Mock).mock.calls[0][2];

    act(() => {
      onReceivedData({ action: 'unknown_action', data: 'some data' });
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
      expect.objectContaining({
        action_type: 'undo',
        elements: mockElements,
        drawing_id: mockDrawingId,
        client_id: mockClientId,
      })
    );
  });

  it('should call applyRemoteUndo or applyRemoteRedo when undo_redo_action is received from a different client', () => {
    const mockApplyRemoteUndo = vi.fn();
    const mockApplyRemoteRedo = vi.fn();
    const mockCurrentUserId = 1;
    const mockClientId = 'client-abc';
    const remoteClientId = 'client-xyz'; // 異なるクライアントID

    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: mockApplyRemoteUndo,
      applyRemoteRedo: mockApplyRemoteRedo,
      currentUserId: mockCurrentUserId,
      clientId: mockClientId,
    }));

    // Get the onReceivedData callback from the mock
    const onReceivedData = (useDrawingChannel as Mock).mock.calls[0][2];

    const remoteElements: RawDrawingElement[] = [
      { id: 1, element_type: 'line', data: { path: [[0, 0], [10, 10]], color: '#000', lineWidth: 5 } },
    ];

    const expectedParsedElements: DrawingElementType[] = [
      { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 },
    ];

    // リモートからのUNDOアクションをシミュレート
    act(() => {
      onReceivedData({
        type: 'undo_redo_action',
        action_type: 'undo',
        elements: remoteElements,
        client_id: remoteClientId,
        user_id: mockCurrentUserId + 1, // 異なるユーザーID
        drawing_id: mockDrawingId, // 追加
      });
    });
    expect(mockApplyRemoteUndo).toHaveBeenCalledWith(expectedParsedElements);
    expect(mockApplyRemoteRedo).not.toHaveBeenCalled();

    // リモートからのREDOアクションをシミュレート
    act(() => {
      onReceivedData({
        type: 'undo_redo_action',
        action_type: 'redo',
        elements: remoteElements,
        client_id: remoteClientId,
        user_id: mockCurrentUserId + 1, // 異なるユーザーID
        drawing_id: mockDrawingId, // 追加
      });
    });
    expect(mockApplyRemoteRedo).toHaveBeenCalledWith(expectedParsedElements);
    expect(mockApplyRemoteUndo).toHaveBeenCalledTimes(1); // 最初の呼び出しのまま
  });

  it('should skip applyRemoteUndo or applyRemoteRedo when undo_redo_action is received from the same client (self-broadcast)', () => {
    const mockApplyRemoteUndo = vi.fn();
    const mockApplyRemoteRedo = vi.fn();
    const mockCurrentUserId = 1;
    const mockClientId = 'client-abc'; // ローカルクライアントID

    renderHook(() => useDrawingChannelIntegration({
      drawingId: mockDrawingId,
      addDrawingElement: mockAddDrawingElement,
      onDrawingSaved: mockOnDrawingSaved,
      pendingElementTempId: { current: null },
      applyRemoteUndo: mockApplyRemoteUndo,
      applyRemoteRedo: mockApplyRemoteRedo,
      currentUserId: mockCurrentUserId,
      clientId: mockClientId,
    }));

    // Get the onReceivedData callback from the mock
    const onReceivedData = (useDrawingChannel as Mock).mock.calls[0][2];

    const selfElements: RawDrawingElement[] = [
      { id: 1, element_type: 'line', data: { path: [[0, 0], [10, 10]], color: '#000', lineWidth: 5 } },
    ];

    // 同じクライアントからのUNDOアクションをシミュレート
    act(() => {
      onReceivedData({
        type: 'undo_redo_action',
        action_type: 'undo',
        elements: selfElements,
        client_id: mockClientId, // 同じクライアントID
        user_id: mockCurrentUserId, // 同じユーザーID
        drawing_id: mockDrawingId, // 追加
      });
    });
    expect(mockApplyRemoteUndo).not.toHaveBeenCalled();
    expect(mockApplyRemoteRedo).not.toHaveBeenCalled();

    // 同じクライアントからのREDOアクションをシミュレート
    act(() => {
      onReceivedData({
        type: 'undo_redo_action',
        action_type: 'redo',
        elements: selfElements,
        client_id: mockClientId, // 同じクライアントID
        user_id: mockCurrentUserId, // 同じユーザーID
        drawing_id: mockDrawingId, // 追加
      });
    });
    expect(mockApplyRemoteUndo).not.toHaveBeenCalled();
    expect(mockApplyRemoteRedo).not.toHaveBeenCalled();
  });
});
