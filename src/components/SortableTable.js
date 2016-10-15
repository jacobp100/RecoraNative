// @flow
import React, { Component } from 'react';
import { View, PanResponder, Animated } from 'react-native';
import {
  map, memoize, fromPairs, zip, range, isEqual, forEach, keys, clamp, stubTrue,
} from 'lodash/fp';
import SortableTableRow, { rowHeight } from './SortableTableRow';

export default class SortableTable extends Component {
  constructor(props) {
    super();
    this.state = {
      ...this.initialStateForProps(props),
      width: 0,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.rows !== nextProps.rows) {
      this.setState(this.initialStateForProps(nextProps));
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { draggingOrder: currentDraggingOrder, draggingId } = this.state;
    const { draggingOrder: previousDraggingOrder } = prevState;

    const isDragging = draggingId !== null; // Handled by responderEnd
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

  defaultDraggingOrder = (props = this.props) => range(0, props.rows.length);

  initialStateForProps = props => ({
    draggingId: null,
    draggingOrder: this.defaultDraggingOrder(props),
    rowTops: this.getInitialRowTops(props),
    height: (rowHeight * props.rows.length) + 1,
  })

  responderEnd = () => {
    if (this.props.onDragEnd) this.props.onDragEnd();
    const { draggingId } = this.state;
    if (!draggingId) return;
    this.resetRowTops();
    this.setState({
      draggingId: null,
      draggingOrder: this.defaultDraggingOrder(),
    });
  }

  responderMove = (e, gestureState) => {
    const { dy } = gestureState;
    const { draggingId, rowTops, height } = this.state;
    const baseRowTop = this.baseRowTopFor(draggingId);
    const nextTop = clamp(0, height - rowHeight - 1, baseRowTop + dy);
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
  }

  createGestureRecognizerFor = memoize(id => PanResponder.create({
    onStartShouldSetPanResponder: stubTrue,
    onStartShouldSetPanResponderCapture: stubTrue,
    onMoveShouldSetPanResponder: stubTrue,
    onMoveShouldSetPanResponderCapture: stubTrue,
    onPanResponderRelease: this.responderEnd,
    onPanResponderTerminate: this.responderEnd,
    onPanResponderMove: this.responderMove,
    onPanResponderGrant: () => {
      if (this.props.onDragStart) this.props.onDragStart();
      this.setState({ draggingId: id });
    },
  }))
  createOnRowPressFor = memoize(id => () => {
    if (this.props.onRowPress) this.props.onRowPress(id);
  })
  createOnDeletePressFor = memoize(id => () => {
    if (this.props.onDeletePress) this.props.onDeletePress(id);
  })

  render() {
    const { rows, rowTitles, isEditing } = this.props;
    const { draggingId, rowTops, width, height } = this.state;

    const rowElements = map(id => (
      <SortableTableRow
        key={id}
        width={width}
        top={rowTops[id]}
        title={rowTitles[id]}
        isEditing={isEditing}
        isDragging={draggingId === id}
        onRowPress={this.createOnRowPressFor(id)}
        onDeletePress={this.createOnDeletePressFor(id)}
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
