// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { getOr } from 'lodash/fp';
import HorizontallyRepeatingImage from './HorizontallyRepeatingImage';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setQuickCalculationInput } from '../redux';

const borderImage = require('../../assets/border-image.png');

const borderImageHeight = 34;
const borderImageWidth = 512;


const overflow = 400;

const paddingStyles = {
  paddingVertical: 6,
  paddingHorizontal: 18,
};

const styles = StyleSheet.create({
  container: {
    paddingTop: overflow,
    marginTop: -overflow,
  },
  containerPadded: {
    padding: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 36,
    fontWeight: '200',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 36,
    color: 'white',
    backgroundColor: 'transparent',
  },
  quickCalculationContainer: {
    flexDirection: 'row',
    borderRadius: 36,
    overflow: 'hidden',
  },
  textInputContainer: {
    flex: 1,
  },
  textInput: {
    ...paddingStyles,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  resultContainer: {
    ...paddingStyles,
    maxWidth: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  result: {
    textAlign: 'right',
    color: 'black',
    fontWeight: '600',
    marginTop: 5,
  },
});

class QuickCalculation extends Component {
  state = {
    textInputHeight: 22,
  }

  onChange = (e) => {
    const { text } = e.nativeEvent;
    const textInput = text.replace(/\n/g, '');
    const { onChangeText } = this.props;
    if (onChangeText) onChangeText(textInput);
  }

  onContentSizeChange = (e) => {
    const { height: textInputHeight } = e.nativeEvent.contentSize;
    this.setState({ textInputHeight });
  }

  render() {
    const { textInputHeight } = this.state;
    const { textInput, result } = this.props;

    return (
      <LinearGradient
        colors={['rgb(218, 28, 120)', 'rgb(220, 28, 100)']}
        start={[0, 0]} end={[1, 0]}
        style={styles.container}
      >
        <View style={styles.containerPadded}>
          <View>
            <Text style={styles.title}>
              Recora
            </Text>
          </View>
          <View style={styles.quickCalculationContainer}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={[styles.textInput, { height: textInputHeight }]}
                placeholder="Type a quick calculation"
                placeholderTextColor="rgba(218, 28, 120, 0.3)"
                returnKeyType="done"
                onChange={this.onChange}
                onContentSizeChange={this.onContentSizeChange}
                multiline
                blurOnSubmit
              >
                <HighlightedEntryInput
                  text={textInput}
                  result={result}
                  hideBackground
                />
              </TextInput>
            </View>
            <View style={styles.resultContainer}>
              <Text
                style={styles.result}
                ellipsizeMode="middle"
                numberOfLines={1}
              >
                {getOr('?', 'pretty', result)}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ height: borderImageHeight }}>
          <HorizontallyRepeatingImage source={borderImage} width={borderImageWidth} />
        </View>
      </LinearGradient>
    );
  }
}

export default connect(
  state => ({
    textInput: state.quickCalculationInput,
    result: state.quickCalculationResult,
  }),
  { onChangeText: setQuickCalculationInput }
)(QuickCalculation);
