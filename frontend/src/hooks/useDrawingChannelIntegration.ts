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

interface ReceivedActionCableData {
  action: string;
  type: string;
  drawing_element?: any;
  drawing_id?: number;
  last_saved_at?: string;
  action_type?: "undo" | "redo";
  elements?: any[];
  client_id?: string;
}

export const useDrawingChannelIntegration = (
  { drawingId, addDrawingElement, onDrawingSaved, pendingElementTempId, applyRemoteUndo, applyRemoteRedo, currentUserId, clientId }: UseDrawingChannelIntegrationProps
): UseDrawingChannelIntegrationResult => {
  const [_actionCableError, setActionCableError] = useState<string | null>(null);

  const handleReceivedData = useCallback(
    (receivedActionCableData: ReceivedActionCableData) => {
      if (
        receivedActionCableData.type === "drawing_element_created" &&
        receivedActionCableData.drawing_element
      ) {
        const receivedElementTempId = receivedActionCableData.drawing_element.temp_id;

        if (receivedElementTempId && receivedElementTempId === pendingElementTempId.current) {
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
        receivedActionCableData.drawing_id === drawingId &&
        receivedActionCableData.action_type &&
        receivedActionCableData.elements
      ) {
        if (receivedActionCableData.client_id === clientId) {
          return;
        }

        const elementsToUpdate: DrawingElementType[] = receivedActionCableData.elements.map((el: any) => parseDrawingElement(el)).filter(Boolean) as DrawingElementType[];
        if (receivedActionCableData.action_type === "undo") {
          applyRemoteUndo(elementsToUpdate);
        } else if (receivedActionCableData.action_type === "redo") {
          applyRemoteRedo(elementsToUpdate);
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
      }
    },
    [channel, status.isConnected]
  );

  const sendUndoRedoAction = useCallback(
    (actionType: "undo" | "redo", elements: DrawingElementType[]) => {
      if (channel && status.isConnected) {
        channel.perform("undo_redo", {
          action_type: actionType,
          elements: elements,
          drawing_id: drawingId,
          client_id: clientId,
        });
      }
    },
    [channel, status.isConnected, drawingId, clientId]
  );

  useEffect(() => {
    if (status.error) {
      setActionCableError(status.error);
    }
  }, [status.error, status]);

  return {
    channelStatus: status,
    sendDrawingElement,
    sendUndoRedoAction,
  };
};
