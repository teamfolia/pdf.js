export const ROLE_PAGE = "ROLE_PAGE";
export const ROLE_OBJECT = "ROLE_OBJECT";
export const ROLE_CORNER_LT = "ROLE_CORNER_LT";
export const ROLE_CORNER_LB = "ROLE_CORNER_LB";
export const ROLE_CORNER_RT = "ROLE_CORNER_RT";
export const ROLE_CORNER_RB = "ROLE_CORNER_RB";
export const ROLE_ARROW_SOURCE = "ROLE_ARROW_SOURCE";
export const ROLE_ARROW_TARGET = "ROLE_ARROW_TARGET";
export const ROLE_TEXTBOX_LEFT_TOP = "ROLE_TEXTBOX_LEFT_TOP";
export const ROLE_TEXTBOX_RIGHT_TOP = "ROLE_TEXTBOX_RIGHT_TOP";
export const ROLE_TEXTBOX_LEFT_BOTTOM = "ROLE_TEXTBOX_LEFT_BOTTOM";
export const ROLE_TEXTBOX_RIGHT_BOTTOM = "ROLE_TEXTBOX_RIGHT_BOTTOM";
export const ROLE_EDITOR = "ROLE_EDITOR";

export const CORNER_CLASSES = {
  ROLE_CORNER_LT: "corner-lt",
  ROLE_CORNER_LB: "corner-lb",
  ROLE_CORNER_RT: "corner-rt",
  ROLE_CORNER_RB: "corner-rb",
  ROLE_TEXTBOX_LEFT_TOP: "corner-lt",
  ROLE_TEXTBOX_RIGHT_TOP: "corner-rt",
  ROLE_TEXTBOX_LEFT_BOTTOM: "corner-lb",
  ROLE_TEXTBOX_RIGHT_BOTTOM: "corner-rb",
};

export const TOOLS = {
  NO_SELECTED_TOOL: "NO_SELECTED_TOOL",
  ERASER: "ERASER",
  PIXEL_ERASER: "PIXEL_ERASER",
  INK: "INK",
  CIRCLE: "CIRCLE",
  SQUARE: "SQUARE",
  ARROW: "ARROW",
  MARKER: "MARKER",
  UNDERLINE: "UNDERLINE",
  CROSSLINE: "CROSSLINE",
  TEXT_BOX: "TEXT_BOX",
  IMAGE: "IMAGE",
  COMMENT: "COMMENT",
  REPLY: "REPLY",
  STAMPS: "STAMPS",

  // unused tools 🤷
  LEAF: "LEAF",
  BOOKMARK: "BOOKMARK",
  AUDIO: "AUDIO",
};

export const ANNOTATION_TYPES = {
  INK: "InkAnnotation",
  CIRCLE: "CircleAnnotation",
  SQUARE: "SquareAnnotation",
  ARROW: "ArrowAnnotation",
  HIGHLIGHT: "HighlightAnnotation",
  TEXT_BOX: "TextBoxAnnotation",
  IMAGE: "ImageAnnotation",
  COMMENT: "CommentAnnotation",
  REPLY: "ReplyAnnotation",
};

export const STAMPS_TYPES = {
  ARROW: "ArrowDocumentStamp",
  CIRCLE: "CircleDocumentStamp",
  IMAGE: "ImageDocumentStamp",
  INK: "InkDocumentStamp",
  SQUARE: "SquareDocumentStamp",
  TEXT_BOX: "TextBoxDocumentStamp",
};

export const ANNO2STAMPS = {
  [ANNOTATION_TYPES.ARROW]: STAMPS_TYPES.ARROW,
  [ANNOTATION_TYPES.CIRCLE]: STAMPS_TYPES.CIRCLE,
  [ANNOTATION_TYPES.IMAGE]: STAMPS_TYPES.IMAGE,
  [ANNOTATION_TYPES.INK]: STAMPS_TYPES.INK,
  [ANNOTATION_TYPES.SQUARE]: STAMPS_TYPES.SQUARE,
  [ANNOTATION_TYPES.TEXT_BOX]: STAMPS_TYPES.TEXT_BOX,
};

export const STAMPS2ANNO = {
  [STAMPS_TYPES.ARROW]: ANNOTATION_TYPES.ARROW,
  [STAMPS_TYPES.CIRCLE]: ANNOTATION_TYPES.CIRCLE,
  [STAMPS_TYPES.IMAGE]: ANNOTATION_TYPES.IMAGE,
  [STAMPS_TYPES.INK]: ANNOTATION_TYPES.INK,
  [STAMPS_TYPES.SQUARE]: ANNOTATION_TYPES.SQUARE,
  [STAMPS_TYPES.TEXT_BOX]: ANNOTATION_TYPES.TEXT_BOX,
};

export const ANNOTATION_WEIGHT = [
  ANNOTATION_TYPES.TEXT_BOX,
  ANNOTATION_TYPES.INK,
  ANNOTATION_TYPES.ARROW,
  ANNOTATION_TYPES.CIRCLE,
  ANNOTATION_TYPES.SQUARE,
  ANNOTATION_TYPES.COMMENT,
  ANNOTATION_TYPES.IMAGE,
  ANNOTATION_TYPES.HIGHLIGHT,
  "pdf-canvas",
];

export const HighlightKind = {
  MARKER: "MARKER",
  UNDERLINE: "UNDERLINE",
  CROSSLINE: "CROSSLINE",
};

export const PERMISSIONS = {
  MANAGE_ANNOTATION: "MANAGE_ANNOTATION",
  DELETE_FOREIGN_ANNOTATION: "DELETE_FOREIGN_ANNOTATION",
  MANAGE_OWN_COMMENT: "MANAGE_OWN_COMMENT",
  DELETE_FOREIGN_COMMENT: "DELETE_FOREIGN_COMMENT",
  SHARE_WORKSPACE: "SHARE_WORKSPACE",
  PUBLISH_WORKSPACE: "PUBLISH_WORKSPACE",
  RENAME_WORKSPACE: "RENAME_WORKSPACE",
  DELETE_WORKSPACE: "DELETE_WORKSPACE",
  ARCHIVE_WORKSPACE: "ARCHIVE_WORKSPACE",
  DUPLICATE_WORKSPACE: "DUPLICATE_WORKSPACE",
  UPLOAD_DOCUMENT: "UPLOAD_DOCUMENT",
  RENAME_DOCUMENT: "RENAME_DOCUMENT",
  DELETE_DOCUMENT: "DELETE_DOCUMENT",
  COPY_DOCUMENT: "COPY_DOCUMENT",
  DOWNLOAD_SOURCE_DOCUMENT: "DOWNLOAD_SOURCE_DOCUMENT",
  DOWNLOAD_ORIGINAL_DOCUMENT: "DOWNLOAD_ORIGINAL_DOCUMENT",
  DOWNLOAD_ANNOTATED_DOCUMENT: "DOWNLOAD_ANNOTATED_DOCUMENT",
};

export const USER_ROLE = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  CONTRIBUTOR: "CONTRIBUTOR",
  VIEWER: "VIEWER",
  PUBLIC_VIEWER: "PUBLIC_VIEWER",
};

export const FONT_FAMILY = {
  SANS_SERIF: "Source Sans Pro",
  SERIF: "Lora",
  MONOSPACE: "Courier Prime",
  SCRIPT: "Cookie",
  FANTASY: "Eagle Lake",
};

export const TEXT_ALIGNMENT = {
  START: "left",
  CENTER: "center",
  END: "right",
};

export const FONT_WEIGHT = {
  W400: "normal",
  W600: "bold",
};

export const RENDERING_ORDER = [
  ANNOTATION_TYPES.COMMENT,
  ANNOTATION_TYPES.TEXT_BOX,
  ANNOTATION_TYPES.ARROW,
  ANNOTATION_TYPES.CIRCLE,
  ANNOTATION_TYPES.SQUARE,
  ANNOTATION_TYPES.INK,
  ANNOTATION_TYPES.IMAGE,
  ANNOTATION_TYPES.HIGHLIGHT,
];
