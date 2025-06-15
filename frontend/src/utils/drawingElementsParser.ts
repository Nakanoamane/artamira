export interface Point {
  x: number;
  y: number;
}

export interface LineElement {
  id?: number;
  temp_id?: string;
  type: "line";
  points: Point[];
  color: string;
  brushSize: number;
}

export interface RectangleElement {
  id?: number;
  temp_id?: string;
  type: "rectangle";
  start: Point;
  end: Point;
  color: string;
  brushSize: number;
}

export interface CircleElement {
  id?: number;
  temp_id?: string;
  type: "circle";
  center: Point;
  radius: number;
  color: string;
  brushSize: number;
}

export type DrawingElementType = LineElement | RectangleElement | CircleElement;

export interface RawDrawingElement {
  id: number | string;
  element_type: "line" | "rectangle" | "circle";
  data: any; // 具体的な構造はelement_typeに依存
  created_at?: string; // オプション
}

export const parseDrawingElement = (
  rawElement: any // Accepting 'any' to handle different incoming structures
): DrawingElementType | null => {

  let parsedElement: DrawingElementType | null = null;

  // Determine the element type. Check 'element_type' first (from backend/API structure), then 'type' (from frontend object structure).
  const elementType = rawElement.element_type || rawElement.type;

  // Extract relevant data. If rawElement has a 'data' property, use it. Otherwise, assume rawElement itself contains the data.
  const elementData = rawElement.data || rawElement;

  const elementId = rawElement.id !== undefined && rawElement.id !== null
    ? (typeof rawElement.id === 'string' && rawElement.id.startsWith('temp-') ? undefined : Number(rawElement.id))
    : undefined;

  // Common properties to extract, handling both lineWidth and brushSize
  const color = elementData.color;
  const brushSize = elementData.brushSize !== undefined ? elementData.brushSize : elementData.lineWidth;

  if (elementType === "line") {
    if (!elementData || (!Array.isArray(elementData.points) && !Array.isArray(elementData.path))) {
      return null;
    }
    const points = elementData.points || elementData.path.map((p: [number, number]) => ({ x: p[0], y: p[1] }));
    parsedElement = {
      id: elementId,
      type: "line",
      points: points,
      color: color,
      brushSize: brushSize,
    };
  } else if (elementType === "rectangle") {
    if (!elementData || !elementData.start || !elementData.end) {
      return null;
    }
    parsedElement = {
      id: elementId,
      type: "rectangle",
      start: { x: elementData.start.x, y: elementData.start.y },
      end: { x: elementData.end.x, y: elementData.end.y },
      color: color,
      brushSize: brushSize,
    };
  } else if (elementType === "circle") {
    if (!elementData || !elementData.center || elementData.radius === undefined) {
      return null;
    }
    parsedElement = {
      id: elementId,
      type: "circle",
      center: { x: elementData.center.x, y: elementData.center.y },
      radius: elementData.radius,
      color: color,
      brushSize: brushSize,
    };
  }

  return parsedElement;
};

export const parseRawElements = (
  rawElements: RawDrawingElement[]
): DrawingElementType[] => {
  return rawElements.map(parseDrawingElement).filter(Boolean) as DrawingElementType[];
};
