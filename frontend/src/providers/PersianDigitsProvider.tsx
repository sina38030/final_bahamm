"use client";

import { useEffect } from "react";

const EN_TO_FA_DIGITS_MAP: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
};

function replaceAsciiDigitsWithPersian(input: string): string {
  return input.replace(/[0-9]/g, (d) => EN_TO_FA_DIGITS_MAP[d] || d);
}

function transformNodeTextContent(root: Node) {
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip script/style tags
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        return /[0-9]/.test(node.nodeValue || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    },
  );

  const nodesToChange: Text[] = [];
  // Collect first to avoid live updates during traversal
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const current = treeWalker.nextNode();
    if (!current) break;
    nodesToChange.push(current as Text);
  }
  for (const textNode of nodesToChange) {
    textNode.nodeValue = replaceAsciiDigitsWithPersian(textNode.nodeValue || "");
  }
}

export function PersianDigitsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initial transform
    transformNodeTextContent(document.body);

    // Throttle mutation processing to reduce performance impact
    let mutationTimeout: NodeJS.Timeout | null = null;
    const pendingMutations: MutationRecord[] = [];
    
    const processMutations = () => {
      const mutations = [...pendingMutations];
      pendingMutations.length = 0;
      
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            // Skip script and style nodes
            if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
            transformNodeTextContent(node);
          });
        } else if (mutation.type === "characterData" && mutation.target) {
          const textNode = mutation.target as Text;
          // Skip if parent is script or style
          const parent = textNode.parentNode;
          if (parent && (parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE')) return;
          textNode.nodeValue = replaceAsciiDigitsWithPersian(textNode.nodeValue || "");
        }
      }
    };

    const observer = new MutationObserver((mutations) => {
      pendingMutations.push(...mutations);
      
      // Throttle processing with requestAnimationFrame
      if (!mutationTimeout) {
        mutationTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            processMutations();
            mutationTimeout = null;
          });
        }, 16); // ~60fps throttling
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (mutationTimeout) clearTimeout(mutationTimeout);
    };
  }, []);

  return <>{children}</>;
}


