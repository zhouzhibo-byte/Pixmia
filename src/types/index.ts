export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export interface MiniMaxSettings {
  apiKey: string;
  promptModel: string;
  imageModel: string;
  promptEndpoint: string;
  imageEndpoint: string;
}

export interface AppSettings {
  defaultRatio: AspectRatio;
  minimax: MiniMaxSettings;
}

export interface ReferenceImage {
  uri: string;
  base64: string;
  mimeType: string;
}

export type AttachmentKind = 'image' | 'file';

export interface ChatAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
  textUri?: string;
  extension?: string;
}

export interface PendingAttachment extends ChatAttachment {
  base64?: string;
  extractedText?: string;
}

export interface GeneratedFile {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
  isText?: boolean;
}

export type MessageStatus = 'sent' | 'loading' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  status: MessageStatus;
  error?: string;
  attachments?: ChatAttachment[];
  imageUri?: string;
  imagePrompt?: string;
  imageRatio?: AspectRatio;
  files?: GeneratedFile[];
  stage?: 'thinking' | 'drawing';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  ratio: AspectRatio;
  messages: ChatMessage[];
}

export interface Album {
  id: string;
  name: string;
  createdAt: number;
}

export interface Artwork {
  id: string;
  prompt: string;
  originalPrompt: string;
  model: string;
  imageModel: string;
  albumId: string;
  ratio: AspectRatio;
  fileUri: string;
  createdAt: number;
}

export interface GeneratedImagePayload {
  url?: string;
  base64?: string;
  mimeType: string;
}

export interface GenerationResult {
  prompt: string;
  model: string;
  imageModel: string;
  ratio: AspectRatio;
  image: GeneratedImagePayload;
}
