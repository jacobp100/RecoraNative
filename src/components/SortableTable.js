// @flow
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, Image, PanResponder } from 'react-native';
import { map, memoize } from 'lodash/fp';
import { tableStyles } from '../styles';


const SortableTableRow = ({ title, attachmentImage, onPress, onAttachmentPress, dragHandle }) => {
  let row = (
    <TouchableOpacity onPress={onPress}>
      <View style={tableStyles.rowContentContainer}>
        <Text style={tableStyles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (attachmentImage || dragHandle) {
    row = (
      <View style={tableStyles.splitRowContentContainer}>
        {dragHandle && <View style={tableStyles.rowContentContainer}>
          {dragHandle}
        </View>}
        <View style={tableStyles.splitRowContentPrimary}>
          {row}
        </View>
        {attachmentImage && <TouchableOpacity onPress={onAttachmentPress}>
          <View style={tableStyles.rowContentContainer}>
            <Image source={attachmentImage} />
          </View>
        </TouchableOpacity>}
      </View>
    );
  }

  return (
    <View>
      {row}
      <View style={tableStyles.separator} />
    </View>
  );
};

const DragHandle = ({ active, ...props }) => (
  <View {...props} style={{ width: 10, height: 10, backgroundColor: active ? 'green' : 'red' }} />
);

export default class SortableTable extends Component {
  state = {
    draggingId: null,
    dy: 0,
  }

  endDrag = () => {
    if (this.props.onDragEnd) this.props.onDragEnd();
    this.setState({ draggingId: null });
  }

  createGestureRecognizerFor = memoize(id => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderRelease: this.endDrag,
    onPanResponderTerminate: this.endDrag,
    onPanResponderGrant: () => {
      if (this.props.onDragStart) this.props.onDragStart();
      this.setState({ draggingId: id });
    },
    onPanResponderMove: (e, gestureState) => {
      const { dy } = gestureState;
      console.log(dy);
      this.setState({ dy });
    },
  }));

  render() {
    const { rows, rowTitles } = this.props;
    const { draggingId, dy } = this.state;
    const isEditing = true;

    const isDragging = draggingId !== null;

    const rowElements = map(id => {
      const dragHandle = isEditing
        ? <DragHandle
          {...this.createGestureRecognizerFor(id).panHandlers}
          active={draggingId === id}
        />
        : null;

      return (
        <SortableTableRow
          key={id}
          title={rowTitles[id]}
          dragHandle={dragHandle}
        />
      );
    }, rows);

    return (
      <View>
        {rowElements}
      </View>
    );
  }
}
