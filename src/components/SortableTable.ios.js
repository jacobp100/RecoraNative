// @flow
import React, { Component, PropTypes } from 'react';
import { View, requireNativeComponent } from 'react-native';

const SortableTableIOS = requireNativeComponent('RCTTableView', {
  name: 'RCTTableView',
  propTypes: {
    rows: PropTypes.arrayOf(PropTypes.string),
    rowTitles: PropTypes.objectOf(PropTypes.string),
    onContentSizeChanged: PropTypes.func,
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
    height: 300,
  }

  onContentSizeChanged = (e) => {
    const { height } = e.nativeEvent;
    console.log(e.nativeEvent);
    this.setState({ height: 300 });
  }

  render() {
    const { rows, rowTitles } = this.props;
    const { height } = this.state;

    return (
      <View style={{ height, borderWidth: 1 }}>
        <SortableTableIOS
          rows={rows}
          rowTitles={rowTitles}
          onContentSizeChanged={this.onContentSizeChanged}
        />
      </View>
    );
  }
}
