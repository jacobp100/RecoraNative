// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, keys, get, getOr, last, matchesProperty, concat } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setTextInput } from '../redux';


class EntryInput extends Component {
  state = {
    height: 22,
  }

  onChangeText = (text) => {
    console.log(text);
    const textInput = text.replace(/\n/g, '');
    const { onChangeText } = this.props;
    if (onChangeText) onChangeText(textInput);
  }

  onContentSizeChange = (e) => {
    const { height } = e.nativeEvent.contentSize;
    this.setState({ height });
  }

  render() {
    let { textInput, result } = this.props; // eslint-disable-line
    const { height } = this.state;

    textInput = textInput.replace(/\n/g, '');

    return (
      <View>
        <TextInput
          style={{ width: 300, height }}
          placeholder="Type to begin calculation…"
          onChangeText={this.onChangeText}
          onContentSizeChange={this.onContentSizeChange}
          multiline
        >
          <HighlightedEntryInput
            text={textInput}
            result={result}
          />
        </TextInput>
        <View>
          <Text>
            {get('pretty', result)}
          </Text>
        </View>
      </View>
    );
  }
}


const EntryStackView = ({ textInputs, results, setTextInput }) => {
  const hideNewEntry = last(textInputs) === '';
  const resultsWithText = results || map(text => ({ text }), textInputs);

  const textInputsWithNewEntry = hideNewEntry
    ? textInputs
    : concat(textInputs, '');
  const resultsWithNewEntry = hideNewEntry
    ? resultsWithText
    : concat(resultsWithText, { text: '' });

  const entryInputs = map(index => (
    <EntryInput
      key={index}
      textInput={textInputsWithNewEntry[index]}
      result={resultsWithNewEntry[index]}
      onChangeText={text => setTextInput(index, text)}
    />
  ), keys(resultsWithNewEntry));

  return (
    <View>
      {entryInputs}
    </View>
  );
};

export default connect(
  ({ sectionTextInputs, sectionResults }, { sectionId }) => ({
    textInputs: getOr([], sectionId, sectionTextInputs),
    results: get(sectionId, sectionResults),
  }),
  (dispatch, { sectionId }) => ({
    setTextInput: (index, text) => dispatch(setTextInput(sectionId, index, text)),
  })
)(EntryStackView);
