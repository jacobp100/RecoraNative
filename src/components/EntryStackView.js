// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, keys, get, getOr, last, concat } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setTextInput } from '../redux';


const hideResultPadding = 6;

const styles = StyleSheet.create({
  entryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  entryContainerLast: {
    borderBottomWidth: 0,
  },
  textInput: {
    fontSize: 14,
    // marginBottom to make EntryInput look normal with hideResult
    marginBottom: hideResultPadding,
  },
  result: {
    textAlign: 'right',
    fontWeight: '600',
    lineHeight: 22,
    height: 22,
    marginTop: -hideResultPadding,
  },
  totalTitle: {
    fontWeight: '400',
    fontSize: 12,
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

  render() {
    let { textInput, result, hideResult } = this.props; // eslint-disable-line
    const { height } = this.state;

    textInput = textInput.replace(/\n/g, '');

    // We use blurOnSubmit because it'll stop adding multiple lines
    // See RCTTextView.m:
    //
    // the purpose of blurOnSubmit on RCTextField is to decide if the
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
          style={[styles.textInput, { height }]}
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
        {!hideResult && <View>
          <Text style={styles.result}>
            {get('pretty', result)}
          </Text>
        </View>}
      </View>
    );
  }
}


const EntryStackView = ({ textInputs, results, total, setTextInput }) => {
  const hideNewEntry = last(textInputs) === '';
  const resultsWithText = results || map(text => ({ text }), textInputs);

  let entryInputs = map(index => (
    <EntryInput
      key={index}
      textInput={textInputs[index]}
      result={resultsWithText[index]}
      onChangeText={text => setTextInput(index, text)}
    />
  ), keys(resultsWithText));

  if (!hideNewEntry) {
    const nextIndex = entryInputs.length;
    const placeholder = (
      <EntryInput
        key={nextIndex}
        textInput=""
        result=""
        onChangeText={text => setTextInput(nextIndex, text)}
        hideResult
      />
    );
    entryInputs = concat(entryInputs, placeholder);
  }

  return (
    <View>
      {entryInputs}
      <View style={[styles.entryContainer, styles.entryContainerLast]}>
        <Text style={styles.result}>
          <Text style={styles.totalTitle}>TOTAL</Text>&ensp;{getOr('-', 'pretty', total)}
        </Text>
      </View>
    </View>
  );
};

export default connect(
  ({ sectionTextInputs, sectionResults, sectionTotals }, { sectionId }) => ({
    textInputs: getOr([], sectionId, sectionTextInputs),
    results: get(sectionId, sectionResults),
    total: get(sectionId, sectionTotals),
  }),
  (dispatch, { sectionId }) => ({
    setTextInput: (index, text) => dispatch(setTextInput(sectionId, index, text)),
  })
)(EntryStackView);
