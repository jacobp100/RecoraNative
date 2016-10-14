// @flow
import React from 'react';
import { View, Text, TouchableHighlight } from 'react-native';

const EditModal = ({ closeModal }) => (
  <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', flex: 1, padding: 36 }}>
    <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24 }}>
      <Text>Hello</Text>
      <TouchableHighlight onPress={closeModal}>
        <View>
          <Text>Close</Text>
        </View>
      </TouchableHighlight>
    </View>
  </View>
);

export default EditModal;
