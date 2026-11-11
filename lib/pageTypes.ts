export type TextAlign = "left" | "center" | "right" | "justify";
export type ImageAlign = "left" | "center" | "right";

export type FlowParagraph = {
  kind: "paragraph";
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  color: string;
};

export type FlowImage = {
  kind: "image";
  id: string;
  align: ImageAlign;
  width: number;
  src: string;
};

export type FlowBlock = FlowParagraph | FlowImage;

export type SavedParagraph = Omit<FlowParagraph, "kind">;

export type SavedImage = {
  id: string;
  align: ImageAlign;
  width: number;
};

export type SavedPage = {
  paragraphs: SavedParagraph[];
  images: SavedImage[];
};

export type SavedText = {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  color: string;
};

export type PageText = SavedText & {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PageImage = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
};

export type PageView = {
  pageNumber: number;
  pageCount: number;
  width: number;
  height: number;
  blocks: FlowBlock[];
};
