export const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
} as const;

export type ToolName = typeof TOOLS[keyof typeof TOOLS];
