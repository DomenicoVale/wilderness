export type ToolKey =
  | 'settings'
  | 'ruler'
  | 'info'
  | 'design'
  | 'user-tools'
  | 'prompt';

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type InfoData = {
  tagName: string;
  id: string;
  className: string;
  rect: Rect;
  typography: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    color: string;
  };
  spacing: {
    margin: string;
    padding: string;
  };
  layout: {
    display: string;
    position: string;
    gap: string;
    justifyContent: string;
    alignItems: string;
  };
  appearance: {
    backgroundColor: string;
    borderRadius: string;
    border: string;
  };
};

export type RulerMeasurement = {
  gapX: number;
  gapY: number;
  aCenter: { x: number; y: number };
  bCenter: { x: number; y: number };
};

