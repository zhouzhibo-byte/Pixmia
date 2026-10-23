# Pixmia

一个基于 Expo / React Native 的 Android AI 创作 App：既能和 MiniMax M3 系列模型聊天、读文件，也能直接生成图片。所有生成的图片和附件只保存在手机本地，不上传任何自有服务器。

## 功能

- **对话式创作**：输入自然语言即可聊天、写代码、输出文件，或直接生成图片。
- **多会话**：每个会话有独立上下文，可随时新建、切换、删除。
- **图片生成**：支持 `1:1`、`3:4`、`4:3`、`16:9`、`9:16` 比例，可上传多张本地图片作参考。
- **文件理解**：支持 txt / md / json / csv / docx / xlsx / pdf 等文件，解析后交给模型理解。
- **文件输出**：模型返回的代码块可保存为本地文件，支持预览、下载、分享。
- **作品管理**：本地画册分类、批量移动、批量删除，可一键保存到系统相册。
- **Markdown 渲染**：代码块、列表、加粗、表格等样式完整展示。
- **本地优先**：作品、附件、会话记录全部保存在设备本地目录。

## 模型串联原理

App 内部把「理解」和「出图」拆成两步，由两个模型接力完成：

1. **意图识别（M3 / M3.1-Flash）**：用户消息连同会话历史、参考图、文件内容一起发送到 Anthropic 兼容接口 `https://api.minimax.cn/anthropic/v1/messages`。系统提示词要求模型先判断意图，并只输出一个 JSON：

   ```json
   {"intent":"image","prompt":"详细的中文图像提示词","aspect_ratio":"1:1","use_previous":false}
   ```

   - `intent=image`：走绘图分支。
   - 其他情况：直接返回聊天文本（可包含文件代码块）。

2. **图片生成（image-01 / image-01-live）**：把上一步得到的 `prompt` 发送到 `https://api.minimax.cn/v1/image_generation`，拿到图片后写入本地目录并登记到作品库。

3. **参考图**：图片模型只接受一张 `subject_reference`，因此取用户上传的第一张图作为主体参考；其余参考图的信息由 M3 在提示词中描述。当用户要求「改上一张图」时，`use_previous` 为 `true`，App 会自动把上一张生成图作为参考图。

## 目录结构

```
src/
  components/    通用 UI（消息气泡、Markdown、文件预览、确认弹窗等）
  constants/     模型清单、主题色、文件类型白名单
  context/       AppContext：设置 / 作品 / 画册 / 会话的全局状态与持久化
  navigation/    底部 Tab（创作 / 作品 / 设置）
  screens/       三个主页面
  services/      imageApi（模型调用）、storage（本地文件与 AsyncStorage）、文件解析
  types/         TypeScript 类型
  utils/         工具函数
```

## 运行

要求 Node.js 18+，并安装 Expo Go（Android）。

```bash
npm install
npx expo start
```

终端会出现二维码，用手机的 Expo Go 扫码即可运行。若手机与电脑不在同一网段，可改用：

```bash
npx expo start --tunnel
```

Web 预览：

```bash
npm run web
```

类型检查：

```bash
npm run typecheck
```

## 配置 API Key

推荐通过环境变量提供默认 Key，避免写死在代码里。在项目根目录新建 `.env`：

```env
EXPO_PUBLIC_MINIMAX_API_KEY=你的_MiniMax_API_Key
```

`.env` 已被 `.gitignore` 忽略，不会进入仓库。也可以在 App 的「设置 → API Key 配置」中直接填写并保存到本地。

设置页还可以调整：

- 主对话模型：`MiniMax-M3.1-Flash` / `MiniMax-M3`，以及接口地址
- 图片生成模型：`image-01` / `image-01-live`，以及接口地址

## 数据与隐私

- 生成的图片、上传的附件、解析出的文本都保存在 App 私有目录（设置页会显示具体路径）。
- 会话记录、画册、设置保存在 AsyncStorage。
- 只有调用模型接口时才会把当前消息、参考图和文件文本发送给 MiniMax，不经过任何第三方服务器。
- 卸载 App 会同时清除本地数据。

## Android 打包

已配置 EAS Build（`eas.json`）：

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

本地导出 JS Bundle 验证：

```bash
npx expo export --platform android
```

## 技术栈

Expo SDK 52 · React Native 0.76 · TypeScript · React Navigation · AsyncStorage · expo-file-system / media-library / image-picker / document-picker / sharing · react-native-markdown-display · JSZip · SheetJS · pdf.js（WebView 内提取 PDF 文本）
