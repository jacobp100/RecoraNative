// @flow
import React, { Component } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { map, range } from 'lodash/fp';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});

export default class HorizontallyRepeatingImage extends Component {
  state = { n: 1 }

  onLayout = (e) => {
    const { width: viewWidth } = e.nativeEvent.layout;
    const { width: imageWidth } = this.props;
    const n = Math.ceil(viewWidth / imageWidth);
    this.setState({ n });
  }

  render() {
    const { source } = this.props;
    const { n } = this.state;

    return (
      <View style={styles.row} onLayout={this.onLayout}>
        {map(i => <Image key={i} source={source} />, range(0, n))}
      </View>
    );
  }
}
