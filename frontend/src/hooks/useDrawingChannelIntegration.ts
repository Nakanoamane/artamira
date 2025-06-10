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

        // Note: drawingElements.some((el) => el.id === receivedElementId) のチェックは
        // DrawingBoard.tsx から useDrawingElements に移動したため、ここでは不要。
        // useDrawingElements 内で重複追加防止のロジックを適切に管理する必要がある。

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
        if (newElement.type === "line") {
          elementDataToSend = {
            id: newElement.id,
            path: newElement.points.map((p) => [p.x, p.y]),
            color: newElement.color,
            lineWidth: newElement.brushSize,
          };
        } else if (newElement.type === "rectangle") {
          elementDataToSend = {
            id: newElement.id,
            start: newElement.start,
            end: newElement.end,
            color: newElement.color,
            lineWidth: newElement.brushSize,
          };
        } else if (newElement.type === "circle") {
          elementDataToSend = {
            id: newElement.id,
            center: newElement.center,
            radius: newElement.radius,
            color: newElement.color,
            brushSize: newElement.brushSize,
          };
        }

        channel.perform("draw", {
          element_type: newElement.type,
          element_data: elementDataToSend,
        });
        setActionCableError(null);
      } else {
        console.warn(
          "WebSocket接続が確立されていないため、描画データを送信できません。"
        );
        setActionCableError(
          "描画データを送信できません。WebSocket接続が確立されていません。"
        );
      }
    },
    [channel, status.isConnected]
  );

  useEffect(() => {
    // ActionCableのエラーはここで処理される
    if (status.error) {
      setActionCableError(status.error);
    }
  }, [status.error]);

  return {
    channelStatus: status,
    sendDrawingElement,
  };
};
