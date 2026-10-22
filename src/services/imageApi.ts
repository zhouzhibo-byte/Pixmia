import { Platform } from 'react-native';
import { IMAGE_MODEL } from '../constants/models';
import { RATIOS } from '../constants/theme';
import {
  AspectRatio,
  GenerationResult,
  MiniMaxSettings,
  ReferenceImage,
} from '../types';

const CHAT_TIMEOUT_MS = 180_000;
const IMAGE_TIMEOUT_MS = 180_000;

const CHAT_SYSTEM = `你是 Pixmia，一个既能聊天、也能创作图片的 AI 助手。
你必须先判断用户最新一条消息的意图：

1. 如果用户明确要求画图、生成图片、改图、设计头像/海报/插画/照片等视觉作品：
   只输出一个 JSON 对象，不要输出任何其他文字、Markdown 或代码块：
   {"intent":"image","prompt":"详细的中文图像提示词","aspect_ratio":"可选，1:1 / 3:4 / 4:3 / 16:9 / 9:16","use_previous":false}
   use_previous 仅在用户要求修改、延续或参考上一张已生成图片时设为 true，其余情况设为 false。
   提示词要包含主体、构图、镜头、光线、材质、风格与氛围，并保留参考图的主体特征。
2. 其他情况（问答、分析图片、解释概念、写代码、写文案、普通聊天）：
   正常用 Markdown 回复，不要输出上面的 JSON。
3. 如果用户要求输出文件，用带文件名的代码块包裹完整内容：
   \`\`\`file:文件名.扩展名
   文件内容
   \`\`\`
   可以输出多个文件，但只输出文本类文件。
4. 不要声称你“已经生成图片”，图片由系统在你返回 image JSON 后生成。
5. 普通聊天保持简洁、准确，使用中文。

判断规则：询问图片里有什么、识别图片、解释图片内容都属于聊天，不要返回 image。只有用户希望你“画出来/做一张图/改图/设计视觉作品”时才返回 image。`;

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatFileText {
  name: string;
  text: string;
}

export interface SendChatOptions {
  settings: MiniMaxSettings;
  history: ChatHistoryItem[];
  userText: string;
  images: ReferenceImage[];
  files: ChatFileText[];
  ratio: AspectRatio;
}

export type ChatIntent =
  | { kind: 'chat'; text: string }
  | {
      kind: 'image';
      prompt: string;
      ratio?: AspectRatio;
      usePrevious?: boolean;
    };

function assertConfig(settings: MiniMaxSettings) {
  if (!settings.apiKey.trim()) {
    throw new Error('请先在设置中填写 MiniMax API Key');
  }
  if (!settings.promptEndpoint.trim()) {
    throw new Error('请先在设置中填写主对话接口地址');
  }
  if (!settings.imageEndpoint.trim()) {
    throw new Error('请先在设置中填写图片生成接口地址');
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    const message =
      json?.error?.message ||
      json?.base_resp?.status_msg ||
      json?.message ||
      json?.error?.code;
    if (message) return String(message);
  } catch {
    // 非 JSON 响应时退回原始文本
  }
  return text.slice(0, 200) || `HTTP ${response.status}`;
}

async function postJson(
  url: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await extractErrorMessage(response);
      if (response.status === 401 || response.status === 403) {
        throw new Error('API Key 无效或当前套餐没有该模型权限，请检查设置');
      }
      if (response.status === 429) {
        throw new Error('请求过于频繁或额度不足，请稍后再试');
      }
      throw new Error(detail || `请求失败（HTTP ${response.status}）`);
    }

    return await response.json();
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('网络请求失败，请检查网络连接');
  } finally {
    clearTimeout(timer);
  }
}

function parseIntent(raw: string): ChatIntent {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  for (const candidate of candidates) {
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed?.intent === 'image' &&
        typeof parsed?.prompt === 'string' &&
        parsed.prompt.trim()
      ) {
        const ratio = RATIOS.some((item) => item.key === parsed.aspect_ratio)
          ? (parsed.aspect_ratio as AspectRatio)
          : undefined;
        return {
          kind: 'image',
          prompt: parsed.prompt.trim(),
          ratio,
          usePrevious: parsed.use_previous === true,
        };
      }
    } catch {
      // 不是合法 JSON，按普通聊天处理
    }
  }

  return { kind: 'chat', text: trimmed };
}

export async function sendChatMessage(options: SendChatOptions): Promise<ChatIntent> {
  const { settings, history, userText, images, files, ratio } = options;
  assertConfig(settings);

  const system = `${CHAT_SYSTEM}\n\n当前画布比例：${ratio}。`;

  const messages: any[] = [];
  history.forEach((item) => {
    if (!item.text.trim()) return;
    messages.push({
      role: item.role,
      content: [{ type: 'text', text: item.text }],
    });
  });

  const fileText = files
    .map((file) => {
      const content = file.text.trim() || '（未能提取文本内容）';
      return `\n\n【文件：${file.name}】\n${content}`;
    })
    .join('');

  const requestText = `${userText.trim() || '请先理解我上传的内容，再回应。'}${fileText}`;
  const content: any[] = [{ type: 'text', text: requestText }];

  images.forEach((image) => {
    if (!image.base64) return;
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType || 'image/jpeg',
        data: image.base64,
      },
    });
  });

  messages.push({ role: 'user', content });

  const normalized: any[] = [];
  messages.forEach((message) => {
    const blocks = Array.isArray(message.content)
      ? message.content
      : [{ type: 'text', text: String(message.content) }];
    const last = normalized[normalized.length - 1];
    if (last && last.role === message.role) {
      last.content = [...last.content, ...blocks];
    } else {
      normalized.push({ role: message.role, content: blocks });
    }
  });
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  const body: any = {
    model: settings.promptModel,
    max_tokens: 8192,
    system,
    messages: normalized,
  };

  if (settings.promptModel === 'MiniMax-M3.1-Flash') {
    body.output_config = { effort: 'low' };
  } else {
    body.thinking = { type: 'disabled' };
  }

  const json = await postJson(
    settings.promptEndpoint,
    settings.apiKey,
    body,
    CHAT_TIMEOUT_MS
  );

  const blocks = Array.isArray(json?.content) ? json.content : [];
  const text = blocks
    .filter((block: any) => block?.type === 'text')
    .map((block: any) => block?.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error(
      json?.stop_reason === 'max_tokens'
        ? '回复被截断，请缩短内容后重试'
        : '模型没有返回内容'
    );
  }

  return parseIntent(text);
}

export async function generateImage(
  prompt: string,
  ratio: AspectRatio,
  reference: ReferenceImage | undefined,
  options: { settings: MiniMaxSettings }
): Promise<GenerationResult> {
  const { settings } = options;
  assertConfig(settings);

  const useBase64 = Platform.OS === 'web';
  const imageModel = settings.imageModel || IMAGE_MODEL;

  const body: any = {
    model: imageModel,
    prompt: prompt.slice(0, 1500),
    aspect_ratio: ratio,
    response_format: useBase64 ? 'base64' : 'url',
    n: 1,
    prompt_optimizer: false,
  };

  if (reference?.base64) {
    body.subject_reference = [
      {
        type: 'character',
        image_file: `data:${reference.mimeType || 'image/jpeg'};base64,${reference.base64}`,
      },
    ];
  }

  const json = await postJson(
    settings.imageEndpoint,
    settings.apiKey,
    body,
    IMAGE_TIMEOUT_MS
  );

  const statusCode = json?.base_resp?.status_code;
  if (statusCode !== undefined && statusCode !== 0) {
    throw new Error(json?.base_resp?.status_msg || '图片生成失败');
  }

  if (useBase64) {
    const base64List = json?.data?.image_base64;
    const base64 = Array.isArray(base64List) ? base64List[0] : base64List;
    if (!base64) throw new Error('图片模型未返回图片数据');
    return {
      prompt,
      model: settings.promptModel,
      imageModel,
      ratio,
      image: { base64, mimeType: 'image/jpeg' },
    };
  }

  const url = json?.data?.image_urls?.[0];
  if (!url) throw new Error('图片模型未返回图片地址');
  return {
    prompt,
    model: settings.promptModel,
    imageModel,
    ratio,
    image: { url, mimeType: 'image/jpeg' },
  };
}
