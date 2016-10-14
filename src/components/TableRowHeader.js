// @flow
import React from 'react';
import { View, Text } from 'react-native';
import { tableStyles } from '../styles';

export default ({ title }) => (
  <View>
    <View style={tableStyles.headerContainer}>
      <Text style={tableStyles.header}>
        {title}
      </Text>
    </View>
    <View style={tableStyles.separator} />
  </View>
);
