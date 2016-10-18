// @flow
import React, { Component, PropTypes } from 'react';
import { requireNativeComponent } from 'react-native';

const SortableTableIOS = requireNativeComponent('RCTTableView', {
  name: 'RCTTableView',
  propTypes: {
    rows: PropTypes.arrayOf(PropTypes.string),
    rowTitles: PropTypes.objectOf(PropTypes.string),
    onContentSizeChanged: PropTypes.func,
    onRowPress: PropTypes.func,
    onDeletePress: PropTypes.func,
    onRowChangeText: PropTypes.func,
  },
}, {
  nativeOnly: {
    onContentSizeChanged: true,
  },
});

export default class SortableTable extends Component {
  static propTypes = {
    rows: PropTypes.arrayOf(PropTypes.string),
    rowTitles: PropTypes.objectOf(PropTypes.string),
    onContentSizeChanged: PropTypes.func, // eslint-disable-line
  }

  state = {
    height: 100,
  }

  onContentSizeChanged = (e) => {
    const { height } = e.nativeEvent;
    this.setState({ height });
  }

  onRowPress = (e) => {
    if (this.props.onRowPress) this.props.onRowPress(e.nativeEvent.id);
  }

  onDeletePress = (e) => {
    if (this.props.onDeletePress) this.props.onDeletePress(e.nativeEvent.id);
  }

  render() {
    const { rows, rowTitles } = this.props;
    const { height } = this.state;

    return (
      <SortableTableIOS
        style={{ height }}
        rows={rows}
        rowTitles={rowTitles}
        onContentSizeChanged={this.onContentSizeChanged}
        onRowPress={this.onRowPress}
        onDeletePress={this.onDeletePress}
      />
    );
  }
}
