// @flow
import React, { Component } from 'react';
import {
  View, Text, TouchableOpacity, Image, PanResponder, Animated, StyleSheet,
} from 'react-native';
import { map, memoize, fromPairs, zip, range, isEqual, forEach, keys, clamp } from 'lodash/fp';

const rowHeight = 44;

export const tableStyles = StyleSheet.create({
  // headerContainer: {
  //   height: 36,
  //   paddingHorizontal: 24,
  //   paddingVertical: 6,
  //   justifyContent: 'flex-end',
  // },
  // header: {
  //   color: '#555',
  //   fontSize: 10,
  // },
  // splitRowContentContainer: {
  //   flexDirection: 'row',
  // },
  // splitRowContentPrimary: {
  //   flex: 1,
  // },
  // rowContentContainer: {
  //   paddingHorizontal: 24,
  //   paddingVertical: 12,
  // },
  // activeRow: {
  //   backgroundColor: '#222',
  // },
  // text: {
  //   fontSize: 16,
  //   fontWeight: '400',
  //   // color: primary,
  // },
  // destructiveText: {
  //   color: 'white',
  // },
  // separatorActive: {
  //   backgroundColor: '#2F2F2F',
  // },
  // instructions: {
  //   paddingHorizontal: 20,
  //   paddingVertical: 20,
  //   color: '#666',
  //   fontSize: 16,
  //   textAlign: 'center',
  // },

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
    // paddingHorizontal: 24,
    paddingVertical: 12,
  },
  rowTitleText: {
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
    marginTop: 1,
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
});

const SortableTableRow = ({ top, width, title, onPress, onDelete, dragHandler, active }) => (
  <Animated.View style={{ position: 'absolute', width, top, zIndex: active ? 2 : 1 }}>
    <View style={tableStyles.row}>
      <TouchableOpacity onPress={onDelete}>
        <View style={tableStyles.rowDeleteButton}>
          <Text style={tableStyles.rowDeleteButtonText}>&minus;</Text>
        </View>
      </TouchableOpacity>
      <View style={tableStyles.rowTitle}>
        <TouchableOpacity onPress={onPress}>
          <View style={tableStyles.rowContentContainer}>
            <Text style={tableStyles.text}>{title}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View {...dragHandler} style={tableStyles.dragHandle}>
        <View style={tableStyles.dragHandleRow} />
        <View style={tableStyles.dragHandleRow} />
        <View style={tableStyles.dragHandleRow} />
      </View>
    </View>
  </Animated.View>
);

export default class SortableTable extends Component {
  constructor(props) {
    super();
    this.state = this.initialStateForProps(props);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.rows !== nextProps.rows) {
      this.setState(this.initialStateForProps(nextProps));
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { draggingOrder: currentDraggingOrder, draggingId } = this.state;
    const { draggingOrder: previousDraggingOrder } = prevState;

    const isDragging = draggingId !== null; // Handled by endDrag
    if (!isDragging) return;

    const draggingOrderUnchanged = isEqual(currentDraggingOrder, previousDraggingOrder);
    if (draggingOrderUnchanged) return;

    forEach(index => {
      if (currentDraggingOrder[index] === previousDraggingOrder[index]) return;
      const rowIndex = currentDraggingOrder[index];
      const rowId = this.props.rows[rowIndex];
      if (rowId === this.state.draggingId) return;
      const rowTop = this.state.rowTops[rowId];
      const toValue = this.rowTopForIndex(index);
      Animated.timing(rowTop, { toValue, duration: 300 }).start();
    }, keys(currentDraggingOrder));
  }

  onLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    this.setState({ width });
  }

  getInitialRowTops = (props) => {
    const animatedValues = map(id => (
      new Animated.Value(this.baseRowTopFor(id, props))
    ), props.rows);
    return fromPairs(zip(props.rows, animatedValues));
  }

  resetRowTops = () => {
    forEach(id => (
      this.state.rowTops[id].setValue(this.baseRowTopFor(id))
    ), this.props.rows);
  }

  baseRowTopFor = (id, props = this.props) => this.rowTopForIndex(this.indexForRow(id, props))
  indexForRow = (id, props = this.props) => props.rows.indexOf(id);
  rowTopForIndex = index => index * rowHeight;

  initialStateForProps = props => ({
    draggingId: null,
    rowTops: this.getInitialRowTops(props),
    draggingOrder: range(0, props.rows.length),
    width: 0,
    height: (rowHeight * props.rows.length) + 1,
  });

  endDrag = () => {
    if (this.props.onDragEnd) this.props.onDragEnd();
    const { draggingId } = this.state;
    if (!draggingId) return;
    this.resetRowTops();
    this.setState({
      draggingId: null,
      draggingOrder: range(0, this.props.rows.length),
    });
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
      const { draggingId, rowTops, height } = this.state;
      const baseRowTop = this.baseRowTopFor(draggingId);
      const nextTop = clamp(0, height - rowHeight, baseRowTop + dy);
      rowTops[draggingId].setValue(nextTop);

      const rowIndex = this.props.rows.indexOf(draggingId);
      const currentDraggingIndex = this.state.draggingOrder.indexOf(rowIndex);
      const newDraggingIndex = Math.round(nextTop / rowHeight);

      if (currentDraggingIndex !== newDraggingIndex) {
        const newDraggingOrder = range(0, this.props.rows.length);
        newDraggingOrder.splice(rowIndex, rowIndex + 1);
        newDraggingOrder.splice(newDraggingIndex, newDraggingIndex, rowIndex);
        this.setState({ draggingOrder: newDraggingOrder });
      }
    },
  }));

  render() {
    const { rows, rowTitles } = this.props;
    const { draggingId, rowTops, width, height } = this.state;
    // const isEditing = true;

    const rowElements = map(id => (
      <SortableTableRow
        key={id}
        width={width}
        top={rowTops[id]}
        title={rowTitles[id]}
        active={draggingId === id}
        dragHandler={this.createGestureRecognizerFor(id).panHandlers}
      />
    ), rows);

    return (
      <View onLayout={this.onLayout} style={{ height }}>
        {rowElements}
      </View>
    );
  }
}
