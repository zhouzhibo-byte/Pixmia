import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { makeId } from '../utils/id';

const PDFJS_VERSION = '3.11.174';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

function buildHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body>
<script src="${PDFJS_BASE}/pdf.min.js"></script>
<script>
(function () {
  function post(text) {
    try { window.ReactNativeWebView.postMessage(text); } catch (e) {}
  }
  function fail(message) { post('ERROR:' + message); }
  try {
    if (!window.pdfjsLib) { fail('PDF 组件加载失败'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_BASE}/pdf.worker.min.js';
    function toBytes(b64) {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    pdfjsLib.getDocument({ data: toBytes('${base64}') }).promise.then(async function (pdf) {
      var out = '';
      for (var i = 1; i <= pdf.numPages; i += 1) {
        var page = await pdf.getPage(i);
        var content = await page.getTextContent();
        out += content.items.map(function (item) { return item.str || ''; }).join(' ') + '\\n';
        if (out.length > 40000) break;
      }
      post(out);
    }).catch(function (error) {
      fail(error && error.message ? error.message : 'PDF 解析失败');
    });
  } catch (error) {
    fail(error && error.message ? error.message : 'PDF 解析失败');
  }
})();
</script>
</body>
</html>`;
}

interface PdfTextExtractorProps {
  base64: string;
  onDone: (text: string) => void;
}

export function PdfTextExtractor({ base64, onDone }: PdfTextExtractorProps) {
  const html = useMemo(() => buildHtml(base64), [base64]);
  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => onDone(event.nativeEvent.data)}
      />
    </View>
  );
}

interface PdfTask {
  id: string;
  base64: string;
  resolve: (text: string) => void;
}

export function usePdfTextExtractor() {
  const [active, setActive] = useState<{ id: string; base64: string } | null>(null);
  const queueRef = useRef<PdfTask[]>([]);
  const currentRef = useRef<PdfTask | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startNextRef = useRef<() => void>(() => undefined);
  const finishRef = useRef<(text: string) => void>(() => undefined);

  const startNext = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = queueRef.current.shift();
    if (!next) {
      currentRef.current = null;
      setActive(null);
      return;
    }
    currentRef.current = next;
    setActive({ id: next.id, base64: next.base64 });
    timerRef.current = setTimeout(() => finishRef.current(''), 90_000);
  }, []);

  const finish = useCallback((text: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const task = currentRef.current;
    currentRef.current = null;
    if (task) {
      task.resolve(text.startsWith('ERROR:') ? '' : text);
    }
    startNextRef.current();
  }, []);

  useEffect(() => {
    startNextRef.current = startNext;
    finishRef.current = finish;
  }, [startNext, finish]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const extractPdf = useCallback((base64: string) => {
    return new Promise<string>((resolve) => {
      if (Platform.OS === 'web') {
        resolve('');
        return;
      }
      queueRef.current.push({ id: makeId(), base64, resolve });
      if (!currentRef.current) {
        startNextRef.current();
      }
    });
  }, []);

  const pdfElement = active ? (
    <PdfTextExtractor key={active.id} base64={active.base64} onDone={finish} />
  ) : null;

  return { extractPdf, pdfElement };
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -10,
    top: -10,
    overflow: 'hidden',
  },
});
