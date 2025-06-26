import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  onChange,
  placeholder = "Start writing...",
  autoFocus = false,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the component is fully mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleTextChange = (text: string) => {
    setLocalContent(text);
    onChange(text);
  };

  // Simple tag highlighting function
  const highlightTags = (text: string): string => {
    // For now, we'll just return the text as-is
    // In a more advanced implementation, we could use rich text highlighting
    return text;
  };

  return (
    <View style={styles.container}>
      <View style={styles.editorContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={localContent}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          multiline
          autoFocus={autoFocus}
          scrollEnabled={false}
          textAlignVertical="top"
          selectionColor="#007AFF"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  editorContainer: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 27,
    color: '#000000',
    textAlignVertical: 'top',
    fontWeight: '400',
    padding: 0,
    margin: 0,
  },
});