// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, keys, get, getOr, last, concat } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setQuickCalculationInput } from '../redux';


const overflow = 400;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgb(218, 28, 120)',
    padding: 12,
    paddingTop: overflow + 12,
    marginTop: -overflow,
  },
  title: {
    fontSize: 36,
    fontWeight: '100',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 36,
    color: 'white',
  },
  textInputContainer: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  textInput: {
    flex: 1,
  },
  resultContainer: {
    maxWidth: 100,
  },
  result: {
    textAlign: 'right',
    color: 'black',
    fontWeight: '600',
    marginTop: 5,
    marginLeft: 12,
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
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>
            Recora
          </Text>
        </View>
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
