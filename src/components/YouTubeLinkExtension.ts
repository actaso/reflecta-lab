'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { extractYouTubeVideoId, fetchYouTubeVideoTitle, isYouTubeUrl } from '../utils/youtube';

export const YouTubeLinkExtension = Extension.create({
  name: 'youtubeLink',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('youtubeLink'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain');
            if (!text || !isYouTubeUrl(text)) {
              return false;
            }

            const videoId = extractYouTubeVideoId(text);
            if (!videoId) return false;

            event.preventDefault();

            fetchYouTubeVideoTitle(videoId).then((title) => {
              const linkText = title || text;
              const { tr } = view.state;
              const { from } = view.state.selection;
              
              const linkNode = view.state.schema.text(linkText, [
                view.state.schema.marks.link.create({ href: text })
              ]);
              
              const transaction = tr.insert(from, linkNode);
              view.dispatch(transaction);
            }).catch(() => {
              const { tr } = view.state;
              const { from } = view.state.selection;
              
              const linkNode = view.state.schema.text(text, [
                view.state.schema.marks.link.create({ href: text })
              ]);
              
              const transaction = tr.insert(from, linkNode);
              view.dispatch(transaction);
            });

            return true;
          },
        },
      }),
    ];
  },
});
