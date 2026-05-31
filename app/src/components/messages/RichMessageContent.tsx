import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RichMessageContentProps {
  content: string;
  className?: string;
}

const allowedTags = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'EM',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'PRE',
  'STRONG',
  'U',
  'UL',
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function linkifyPlainText(value: string) {
  const escaped = escapeHtml(value);
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+|mailto:[^\s<]+|tel:[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
  return linked.replace(/\n/g, '<br>');
}

function isSafeUrl(value: string) {
  try {
    const parsed = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  if (!allowedTags.has(element.tagName)) {
    const fragment = document.createDocumentFragment();
    element.childNodes.forEach((child) => {
      const sanitized = sanitizeNode(child);
      if (sanitized) fragment.appendChild(sanitized);
    });
    return fragment;
  }

  const cleanElement = document.createElement(element.tagName.toLowerCase());

  if (element.tagName === 'A') {
    const href = element.getAttribute('href') || '';
    if (href && isSafeUrl(href)) {
      cleanElement.setAttribute('href', href);
      cleanElement.setAttribute('target', '_blank');
      cleanElement.setAttribute('rel', 'noopener noreferrer');
    }
  }

  if (element.tagName === 'IMG') {
    const src = element.getAttribute('src') || '';
    if (src && isSafeUrl(src)) {
      cleanElement.setAttribute('src', src);
      cleanElement.setAttribute('alt', element.getAttribute('alt') || 'Message image');
      cleanElement.setAttribute('loading', 'lazy');
    } else {
      return null;
    }
  }

  element.childNodes.forEach((child) => {
    const sanitized = sanitizeNode(child);
    if (sanitized) cleanElement.appendChild(sanitized);
  });

  return cleanElement;
}

function sanitizeRichHtml(value: string) {
  if (!value.trim()) return '';
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  if (!hasHtml) return linkifyPlainText(value);
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return linkifyPlainText(value);
  }

  const doc = new DOMParser().parseFromString(value, 'text/html');
  const container = document.createElement('div');
  doc.body.childNodes.forEach((node) => {
    const sanitized = sanitizeNode(node);
    if (sanitized) container.appendChild(sanitized);
  });
  return container.innerHTML;
}

export function RichMessageContent({ content, className }: RichMessageContentProps) {
  const safeHtml = useMemo(() => sanitizeRichHtml(content || ''), [content]);

  return (
    <div
      className={cn(
        'rich-message-content text-sm font-medium leading-6 text-slate-800 [&_a]:font-extrabold [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-700 [&_img]:mt-3 [&_img]:max-h-72 [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:shadow-sm [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-3 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-white [&_ul]:list-disc',
        className
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
