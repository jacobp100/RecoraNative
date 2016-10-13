// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, flatMap, keys, get, getOr, set, values, sum } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setTextInputs } from '../redux';


class TextView extends Component {
  state = {
    textHeights: {},
    selection: { start: 0, end: 0 },
  }

  componentWillReceiveProps(prevProps) {
    console.log(prevProps);
    if (prevProps.textInputs !== this.props.textInputs) {
      const { start, end } = this.state.selection;
      console.log(start, end);
      this.setState({ start: Math.max(0, start - 2), end: Math.max(0, end - 2) });
    }
  }

  setSelection = (e) => {
    this.setState({ selection: e.nativeEvent.selection });
  }

  setTextHeight = (e, index) => {
    const height = e.nativeEvent.height;
    if (this.state.textHeights[index] !== height) {
      this.setState(set(['textHeights', index], height));
    }
  }

  render() {
    const { textHeights, selection } = this.state;
    const { textInputs, results, setTextInputs } = this.props;
    const resultsWithText = results || map(text => ({ text }), textInputs);

    const entryInputs = flatMap(index => [
      <HighlightedEntryInput
        key={index}
        text={textInputs[index]}
        result={resultsWithText[index]}
        onLayout={e => this.onLayout(e, index)}
        insertNewLine
      />,
      '\n',
    ], keys(textInputs));

    const height = sum(values(textHeights));

    return (
      <View>
        <TextInput
          style={{ width: 300, height: 300 }}
          placeholder="Type to begin calculation…"
          selection={selection}
          onChangeText={setTextInputs}
          onSelectionChange={this.setSelection}
          multiline
        >
          {entryInputs}
        </TextInput>
      </View>
    );
  }
}

export default connect(
  ({ sectionTextInputs, sectionResults }, { sectionId }) => ({
    textInputs: getOr([], sectionId, sectionTextInputs),
    results: get(sectionId, sectionResults),
  }),
  (dispatch, { sectionId }) => ({
    setTextInputs: text => console.log(text)||dispatch(setTextInputs(sectionId, text.split('\n'))),
  })
)(TextView);
