import { useEffect, useCallback, useState } from "react";
import { useDrawingChannel } from "./useDrawingChannel";
import { DrawingElementType, parseDrawingElement } from "../utils/drawingElementsParser";

interface UseDrawingChannelIntegrationProps {
  drawingId: number | undefined;
  addDrawingElement: (element: DrawingElementType) => void;
  onDrawingSaved: (lastSavedAt: Date | null) => void;
  pendingElementTempId: React.MutableRefObject<string | null>;
  applyRemoteUndo: (elements: DrawingElementType[]) => void;
  applyRemoteRedo: (elements: DrawingElementType[]) => void;
  currentUserId: number | undefined;
  clientId: string;
}

interface UseDrawingChannelIntegrationResult {
  channelStatus: {
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    error: string | null;
  };
  sendDrawingElement: (element: DrawingElementType) => void;
  sendUndoRedoAction: (actionType: "undo" | "redo", elements: DrawingElementType[]) => void;
}

export const useDrawingChannelIntegration = (
  { drawingId, addDrawingElement, onDrawingSaved, pendingElementTempId, applyRemoteUndo, applyRemoteRedo, currentUserId, clientId }: UseDrawingChannelIntegrationProps
): UseDrawingChannelIntegrationResult => {
  const [actionCableError, setActionCableError] = useState<string | null>(null);

  const handleReceivedData = useCallback(
    (receivedActionCableData: any) => {
      // console.log("[useDrawingChannelIntegration] handleReceivedData received:", receivedActionCableData);

      if (
        receivedActionCableData.type === "drawing_element_created" &&
        receivedActionCableData.drawing_element
      ) {
        const receivedElementId = receivedActionCableData.drawing_element.id;
        const receivedElementTempId = receivedActionCableData.drawing_element.temp_id;

        if (receivedElementTempId && receivedElementTempId === pendingElementTempId.current) {
          // console.log("[useDrawingChannelIntegration] Self-broadcasted element received, skipping addDrawingElement:", receivedElementTempId);
          pendingElementTempId.current = null;
          return;
        }

        const receivedElement = parseDrawingElement(receivedActionCableData.drawing_element);

        if (receivedElement) {
          addDrawingElement(receivedElement);
        }
      } else if (
        receivedActionCableData.type === "drawing_saved" &&
        receivedActionCableData.drawing_id === drawingId
      ) {
        onDrawingSaved(
          receivedActionCableData.last_saved_at
            ? new Date(receivedActionCableData.last_saved_at)
            : null
        );
      } else if (
        receivedActionCableData.type === "undo_redo_action" &&
        receivedActionCableData.drawing_id === drawingId
      ) {
        // console.log(`[useDrawingChannelIntegration] Received undo_redo_action: ${receivedActionCableData.action_type}. Elements count: ${receivedActionCableData.elements.length}. User ID: ${receivedActionCableData.user_id}. Received Client ID: ${receivedActionCableData.client_id}. Current Client ID: ${clientId}`);

        // 送信元と同じクライアントからのブロードキャストの場合はスキップ
        if (receivedActionCableData.client_id === clientId) {
          // console.log(`[useDrawingChannelIntegration] Self-broadcasted undo_redo_action received, skipping for client ID: ${clientId}`);
          return;
        }

        const elementsToUpdate: DrawingElementType[] = receivedActionCableData.elements.map((el: any) => parseDrawingElement(el)).filter(Boolean) as DrawingElementType[];

        if (receivedActionCableData.action_type === "undo") {
          applyRemoteUndo(elementsToUpdate);
          // console.log("[useDrawingChannelIntegration] Applied remote UNDO action.");
        } else if (receivedActionCableData.action_type === "redo") {
          applyRemoteRedo(elementsToUpdate);
          // console.log("[useDrawingChannelIntegration] Applied remote REDO action.");
        }
      }
    },
    [drawingId, addDrawingElement, onDrawingSaved, pendingElementTempId, applyRemoteUndo, applyRemoteRedo, currentUserId, clientId]
  );

  const { channel, status } = useDrawingChannel(
    "DrawingChannel",
    drawingId,
    handleReceivedData
  );

  const sendDrawingElement = useCallback(
    (newElement: DrawingElementType) => {
      if (channel && status.isConnected) {
        let elementDataToSend: any;

        const elementId = newElement.id;
        const tempIdToSend = newElement.temp_id;

        if (newElement.type === "line") {
          elementDataToSend = {
            id: elementId,
            path: newElement.points.map((p) => [p.x, p.y]),
            color: newElement.color,
            lineWidth: newElement.brushSize,
          };
        } else if (newElement.type === "rectangle") {
          elementDataToSend = {
            id: elementId,
            start: newElement.start,
            end: newElement.end,
            color: newElement.color,
            lineWidth: newElement.brushSize,
          };
        } else if (newElement.type === "circle") {
          elementDataToSend = {
            id: elementId,
            center: newElement.center,
            radius: newElement.radius,
            color: newElement.color,
            brushSize: newElement.brushSize,
          };
        }

        channel.perform("draw", {
          element_type: newElement.type,
          element_data: elementDataToSend,
          temp_id: tempIdToSend,
        });
        // console.log(`[useDrawingChannelIntegration] Sent drawing_element: type=${newElement.type}, temp_id=${tempIdToSend}`);
      } else {
        // console.log("[useDrawingChannelIntegration] Failed to send drawing_element: Channel not connected.");
      }
    },
    [channel, status.isConnected]
  );

  const sendUndoRedoAction = useCallback(
    (actionType: "undo" | "redo", elements: DrawingElementType[]) => {
      if (channel && status.isConnected) {
        // console.log(`[useDrawingChannelIntegration] Sending undo_redo_action: ${actionType}. Elements count: ${elements.length}. Client ID being sent: ${clientId}`);
        channel.perform("undo_redo", {
          action_type: actionType,
          elements: elements,
          drawing_id: drawingId,
          client_id: clientId,
        });
      } else {
        // console.log("[useDrawingChannelIntegration] Failed to send undo_redo_action: Channel not connected.");
      }
    },
    [channel, status.isConnected, drawingId, clientId]
  );

  useEffect(() => {
    if (status.error) {
      setActionCableError(status.error);
    }
  }, [status.error]);

  return {
    channelStatus: status,
    sendDrawingElement,
    sendUndoRedoAction,
  };
};
