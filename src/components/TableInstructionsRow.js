// @flow
import React from 'react';
import { View, Text } from 'react-native';
import { tableStyles } from '../styles';

export default ({ children }) => (
  <View>
    <Text style={tableStyles.instructions}>
      {children}
    </Text>
  </View>
);
