import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS } from '../constants/theme';

interface Props {
  children: string;
}

export default function MarkdownText({ children }: Props) {
  return (
    <Markdown
      style={markdownStyles}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => undefined);
        return false;
      }}
    >
      {children}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.ink,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  heading1: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 8,
    marginBottom: 6,
  },
  heading2: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 8,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: COLORS.ink,
    marginTop: 6,
    marginBottom: 4,
  },
  heading4: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: COLORS.ink,
    marginTop: 6,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '800',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: COLORS.brand,
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: COLORS.bg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginVertical: 6,
    borderRadius: 6,
  },
  code_inline: {
    backgroundColor: '#F0F0EA',
    color: '#B43A2D',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#F2F2ED',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.ink,
  },
  fence: {
    backgroundColor: '#F2F2ED',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.ink,
  },
  bullet_list: {
    marginVertical: 2,
  },
  ordered_list: {
    marginVertical: 2,
  },
  list_item: {
    marginVertical: 2,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
    borderRadius: 8,
    marginVertical: 6,
  },
  th: {
    backgroundColor: COLORS.bg,
    padding: 7,
    fontWeight: '700',
  },
  td: {
    padding: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
  },
  hr: {
    backgroundColor: COLORS.line,
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
});
