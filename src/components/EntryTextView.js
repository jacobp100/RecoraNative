// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, flatMap, keys, get, getOr, clamp, dropRight } from 'lodash/fp';
import HighlightedEntryInput from './HighlightedEntryInput';
import { setTextInputs } from '../redux';


const paddingVertical = 6;
const paddingHorizontal = 12;
const magicNumber1 = 5; // I think this is the text line height - font size
const magicNumber2 = 5;

const totalBaseProps = {
  lineHeight: 22,
  marginTop: 8,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical,
  },
  textInput: {
    borderRightWidth: 1,
    borderRightColor: '#888',
    paddingHorizontal,
    paddingVertical: 0,
  },
  results: {
    paddingHorizontal,
  },
  resultsContainer: {
    marginBottom: magicNumber2,
  },
  resultContainer: {
    position: 'relative',
    zIndex: 1,
  },
  resultHeightPlaceholder: {
    opacity: 0,
  },
  resultValue: {
    position: 'absolute',
    top: magicNumber1,
    left: 0,
  },
  totalTitle: {
    ...totalBaseProps,
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'right',
  },
  totalText: {
    ...totalBaseProps,
    fontWeight: '600',
  },
});

class TextView extends Component {
  state = {
    textInputWidth: 0,
    textInputHeight: 0,
    width: 0,
  }

  setSelection = (e) => {
    this.setState({ selection: e.nativeEvent.selection });
  }

  setWidthTextInputWidth = (e) => {
    const { width } = e.nativeEvent.layout;
    const textInputWidth = clamp(100, 600, width * 0.66) - (2 * paddingHorizontal);
    this.setState({ width, textInputWidth });
  }

  setHeight = (e) => {
    const { height: textInputHeight } = e.nativeEvent.contentSize;
    this.setState({ textInputHeight });
  }

  render() {
    const { textInputWidth, textInputHeight } = this.state;
    const { textInputs, results, total, setTextInputs } = this.props;
    const resultsWithText = results || map(text => ({ text }), textInputs);

    const indices = keys(textInputs);

    let entryInputElements = flatMap(index => [
      <HighlightedEntryInput
        key={index}
        text={textInputs[index]}
        result={resultsWithText[index]}
      />,
      '\n',
    ], indices);
    entryInputElements = dropRight(1, entryInputElements);

    const resultElements = map(index => (
      <View key={index} style={styles.resultContainer}>
        <View style={[styles.resultHeightPlaceholder, { width: textInputWidth }]}>
          <Text>textInputs[index]</Text>
        </View>
        <View style={styles.resultValue}>
          <Text>{getOr('', [index, 'pretty'], results)}</Text>
        </View>
      </View>
    ), indices);

    return (
      <View style={[styles.container]} onLayout={this.setWidthTextInputWidth}>
        <View style={[styles.textInput, { width: textInputWidth }]}>
          <TextInput
            style={{ fontSize: 14, width: textInputWidth, height: textInputHeight }}
            placeholder="Type to begin calculation…"
            onChangeText={setTextInputs}
            onContentSizeChange={this.setHeight}
            multiline
          >
            {entryInputElements}
          </TextInput>
          <Text style={styles.totalTitle}>
            TOTAL
          </Text>
        </View>
        <View style={styles.results}>
          <View style={styles.resultsContainer}>
            {resultElements}
          </View>
          <Text style={styles.totalText}>
            {getOr('-', 'pretty', total)}
          </Text>
        </View>
      </View>
    );
  }
}

export default connect(
  ({ sectionTextInputs, sectionResults, sectionTotals }, { sectionId }) => ({
    textInputs: getOr([], sectionId, sectionTextInputs),
    results: get(sectionId, sectionResults),
    total: get(sectionId, sectionTotals),
  }),
  (dispatch, { sectionId }) => ({
    setTextInputs: text => dispatch(setTextInputs(sectionId, text.split('\n'))),
  })
)(TextView);
