'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const AutoTagExtension = Extension.create({
  name: 'autoTag',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoTag'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const doc = state.doc;
            
            // Regex to match word: pattern at the beginning of a line (word followed by colon, no space)
            // Exclude protocol patterns like "https:", "http:", "ftp:", etc.
            const tagRegex = /^(?!(?:https?|ftp|mailto|file|tel):)([a-zA-Z0-9_-]+):/gm;
            
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                tagRegex.lastIndex = 0; // Reset regex
                let match;
                while ((match = tagRegex.exec(node.text)) !== null) {
                  const from = pos + match.index;
                  const to = from + match[0].length;
                  
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'tag-highlight',
                      style: 'background: #fef3c7 !important; color: #92400e !important; padding: 0.1em 0.3em; border-radius: 3px; font-weight: 500;'
                    })
                  );
                }
              }
            });
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});