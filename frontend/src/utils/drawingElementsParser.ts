export interface Point {
  x: number;
  y: number;
}

export interface LineElement {
  id: string;
  tempId?: string;
  type: "line";
  points: Point[];
  color: string;
  brushSize: number;
}

export interface RectangleElement {
  id: string;
  tempId?: string;
  type: "rectangle";
  start: Point;
  end: Point;
  color: string;
  brushSize: number;
}

export interface CircleElement {
  id: string;
  tempId?: string;
  type: "circle";
  center: Point;
  radius: number;
  color: string;
  brushSize: number;
}

export type DrawingElementType = LineElement | RectangleElement | CircleElement;

export interface RawDrawingElement {
  id: string;
  element_type: "line" | "rectangle" | "circle";
  data: any; // 具体的な構造はelement_typeに依存
  created_at?: string; // オプション
}

export const parseDrawingElement = (
  rawElement: RawDrawingElement
): DrawingElementType | null => {
  let parsedElement: DrawingElementType | null = null;

  if (rawElement.element_type === "line") {
    if (!rawElement.data || !Array.isArray(rawElement.data.path)) {
      return null;
    }
    parsedElement = {
      id: rawElement.id,
      type: "line",
      points: rawElement.data.path.map((p: [number, number]) => ({
        x: p[0],
        y: p[1],
      })),
      color: rawElement.data.color,
      brushSize: rawElement.data.lineWidth,
    };
  } else if (rawElement.element_type === "rectangle") {
    if (!rawElement.data || !rawElement.data.start || !rawElement.data.end) {
      return null;
    }
    parsedElement = {
      id: rawElement.id,
      type: "rectangle",
      start: { x: rawElement.data.start.x, y: rawElement.data.start.y },
      end: { x: rawElement.data.end.x, y: rawElement.data.end.y },
      color: rawElement.data.color,
      brushSize: rawElement.data.lineWidth,
    };
  } else if (rawElement.element_type === "circle") {
    if (!rawElement.data || !rawElement.data.center || rawElement.data.radius === undefined) {
      return null;
    }
    parsedElement = {
      id: rawElement.id,
      type: "circle",
      center: { x: rawElement.data.center.x, y: rawElement.data.center.y },
      radius: rawElement.data.radius,
      color: rawElement.data.color,
      brushSize: rawElement.data.brushSize,
    };
  }
  return parsedElement;
};

export const parseRawElements = (
  rawElements: RawDrawingElement[]
): DrawingElementType[] => {
  return rawElements.map(parseDrawingElement).filter(Boolean) as DrawingElementType[];
};
