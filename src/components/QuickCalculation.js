// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient'; // eslint-disable-line
import { getOr } from 'lodash/fp';
import HorizontallyRepeatingImage from './HorizontallyRepeatingImage';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setQuickCalculationInput, getQuickCalculationExample } from '../redux';

const borderImage = require('../../assets/border-image.png');

const borderImageHeight = 34;
const borderImageWidth = 512;


const overflow = 400;

const styles = StyleSheet.create({
  container: {
    paddingTop: overflow,
    marginTop: -overflow,
  },
  containerPadded: {
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '200',
    textAlign: 'center',
    marginBottom: 24,
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
    paddingVertical: 6,
    paddingHorizontal: 18,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
  },
  resultExampleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  resultContainer: {
    flex: 1,
  },
  result: {
    paddingVertical: 12,
    textAlign: 'right',
    color: 'white',
    backgroundColor: 'transparent',
    fontWeight: '600',
  },
  exampleButton: {
    top: 2,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    color: 'white',
    textAlign: 'left',
    fontSize: 12,
  },
});

class QuickCalculation extends Component {
  state = {
    textInputHeight: 22,
  }

  onChange = (e) => {
    const { text } = e.nativeEvent;
    const textInput = text.replace(/\n/g, '');
    this.props.setQuickCalculationInput(textInput);
  }

  onContentSizeChange = (e) => {
    const { height: textInputHeight } = e.nativeEvent.contentSize;
    this.setState({ textInputHeight });
  }

  render() {
    const { textInputHeight } = this.state;
    const { textInput, result, getQuickCalculationExample } = this.props;

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
          <View style={styles.resultExampleContainer}>
            <TouchableOpacity onPress={getQuickCalculationExample}>
              <Text
                style={styles.exampleButton}
                numberOfLines={1}
              >
                Example
              </Text>
            </TouchableOpacity>
            <View style={styles.resultContainer}>
              <Text style={styles.result} numberOfLines={1}>
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
  { setQuickCalculationInput, getQuickCalculationExample }
)(QuickCalculation);
