// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, keys, get, getOr, last, concat } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setTextInput } from '../redux';


const styles = StyleSheet.create({
  entryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});


class EntryInput extends Component {
  state = {
    height: 22,
  }

  onChange = (e) => {
    const { text } = e.nativeEvent;
    const textInput = text.replace(/\n/g, '');
    const { onChangeText } = this.props;
    if (onChangeText) onChangeText(textInput);

    const { height } = e.nativeEvent.contentSize;
    this.setState({ height });
  }

  textInput = null;
  forceSelection = null;

  render() {
    let { textInput, result } = this.props; // eslint-disable-line
    const { height } = this.state;

    textInput = textInput.replace(/\n/g, '');

    // We use blurOnSubmit because it'll stop adding multiple lines
    // See RCTTextView.m:
    //
    // TODO: the purpose of blurOnSubmit on RCTextField is to decide if the
    // field should lose focus when return is pressed or not. We're cheating a
    // bit here by using it on RCTextView to decide if return character should
    // submit the form, or be entered into the field.
    //
    // The reason this is cheating is because there's no way to specify that
    // you want the return key to be swallowed *and* have the field retain
    // focus (which was what blurOnSubmit was originally for). For the case
    // where _blurOnSubmit = YES, this is still the correct and expected
    // behavior though, so we'll leave the don't-blur-or-add-newline problem
    // to be solved another day.

    return (
      <View style={styles.entryContainer}>
        <TextInput
          ref={textInput => { this.textInput = textInput; }}
          style={{ width: 300, height }}
          placeholder="Type to begin calculation…"
          returnKeyType="done"
          onChange={this.onChange}
          multiline
          blurOnSubmit
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
