// @flow
import React, { PropTypes } from 'react';
import { View, Text } from 'react-native';

const TotalRow = ({ totalValue }: Object) => (
  <View>
    <View>
      <Text>Total</Text>
    </View>
    <View>
      <Text>{totalValue}</Text>
    </View>
  </View>
);

TotalRow.propTypes = {
  // ready: PropTypes.bool,
  totalValue: PropTypes.string,
};

export default TotalRow;
