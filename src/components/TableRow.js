// @flow
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { tableStyles } from '../styles';


export default ({ title, attachmentImage, onPress, onAttachmentPress }) => {
  let row = (
    <TouchableOpacity onPress={onPress}>
      <View style={tableStyles.rowContentContainer}>
        <Text style={tableStyles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (attachmentImage) {
    row = (
      <View style={tableStyles.splitRowContentContainer}>
        <View style={tableStyles.splitRowContentPrimary}>
          {row}
        </View>
        <TouchableOpacity onPress={onAttachmentPress}>
          <View style={tableStyles.rowContentContainer}>
            <Image source={attachmentImage} />
          </View>
        </TouchableOpacity>
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
