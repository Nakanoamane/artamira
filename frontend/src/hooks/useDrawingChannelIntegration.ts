import { useEffect, useCallback, useState } from "react";
import { useDrawingChannel } from "./useDrawingChannel";
import { DrawingElementType, parseDrawingElement } from "../utils/drawingElementsParser";

interface UseDrawingChannelIntegrationProps {
  drawingId: number | undefined;
  addDrawingElement: (element: DrawingElementType) => void;
  onDrawingSaved: (lastSavedAt: Date | null) => void;
}

interface UseDrawingChannelIntegrationResult {
  channelStatus: {
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    error: string | null;
  };
  sendDrawingElement: (element: DrawingElementType) => void;
}

export const useDrawingChannelIntegration = (
  { drawingId, addDrawingElement, onDrawingSaved }: UseDrawingChannelIntegrationProps
): UseDrawingChannelIntegrationResult => {
  const [actionCableError, setActionCableError] = useState<string | null>(null);

  const handleReceivedData = useCallback(
    (receivedActionCableData: any) => {
      if (
        receivedActionCableData.type === "drawing_element_created" &&
        receivedActionCableData.drawing_element
      ) {
        const receivedElementId = receivedActionCableData.drawing_element.id;

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
      }
    },
    [drawingId, addDrawingElement, onDrawingSaved]
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
      } else {
        // WebSocket接続が確立されていない場合の処理をここに記述（必要であれば）
      }
    },
    [channel, status.isConnected]
  );

  useEffect(() => {
    if (status.error) {
      setActionCableError(status.error);
    }
  }, [status.error]);

  return {
    channelStatus: status,
    sendDrawingElement,
  };
};
