declare module 'react-emoji-picker' {
  import React from 'react';

  interface EmojiPickerProps {
    onEmojiClick: (emoji: string) => void;
    theme?: 'dark' | 'light';
    emojiSize?: number;
    perLine?: number;
    emoji?: string;
    searchDisabled?: boolean;
    skinTonesDisabled?: boolean;
    lazyLoadEmojis?: boolean;
    previewPosition?: 'none' | 'bottom' | 'top';
  }

  const EmojiPicker: React.FC<EmojiPickerProps>;
  export default EmojiPicker;
}