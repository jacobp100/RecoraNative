// @flow
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';

export const rowHeight = 44;

export const styles = StyleSheet.create({
  rowContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  rowContainerActive: {
    zIndex: 2,
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  row: {
    backgroundColor: 'white',
    flexDirection: 'row',
    height: rowHeight + 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  rowTitle: {
    alignSelf: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  rowTitleEditing: {
    paddingHorizontal: 0,
  },
  rowDeleteButton: {
    backgroundColor: '#FF3B30',
    width: 22,
    height: 22,
    marginVertical: 11,
    marginHorizontal: 18,
    borderRadius: 11,
  },
  rowDeleteButtonText: {
    backgroundColor: 'transparent',
    color: 'white',
    textAlign: 'center',
    marginTop: 1.5,
  },
  dragHandle: {
    height: rowHeight - 1, // Separator
    width: rowHeight - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleRow: {
    width: 22,
    height: 1,
    marginVertical: 1,
    backgroundColor: '#CECED2',
  },
  rowText: {
    lineHeight: 22,
    fontSize: 14,
  },
  rowTextInput: {
    height: 22,
    fontSize: 14,
  },
});

export default ({
  top,
  width,
  title,
  dragHandler,
  isEditing,
  isDragging,
  onRowPress,
  onDeletePress,
  onChangeText,
}) => (
  <Animated.View
    style={[styles.rowContainer, isDragging && styles.rowContainerActive, { width, top }]}
  >
    <View style={styles.row}>
      {isEditing && <TouchableOpacity onPress={onDeletePress}>
        <View style={styles.rowDeleteButton}>
          <Text style={styles.rowDeleteButtonText}>&minus;</Text>
        </View>
      </TouchableOpacity>}
      <View style={[styles.rowTitle, isEditing && styles.rowTitleEditing]}>
        {isEditing ? (
          <TextInput
            style={styles.rowTextInput}
            value={title}
            onChangeText={onChangeText}
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity onPress={onRowPress}>
            <View style={styles.rowContentContainer}>
              <Text style={styles.rowText}>{title}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {isEditing && <View {...dragHandler} style={styles.dragHandle}>
        <View style={styles.dragHandleRow} />
        <View style={styles.dragHandleRow} />
        <View style={styles.dragHandleRow} />
      </View>}
    </View>
  </Animated.View>
);
