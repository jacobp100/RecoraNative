// @flow
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map, reduce, keys, last, concat, compact, get, getOr } from 'lodash/fp';
import { setTextInputs } from '../redux';

const styles = StyleSheet.create({

});

const tagStyles = StyleSheet.create({
  number: { color: '#8D43B2' },
  unit: { color: '#90B021' },
  operator: { color: '#3399DB' },
  color: { color: '#D45BA0' },
  dateTime: { color: '#E67F22' },
  function: { color: '#FFA800' },
  bracket: { color: '#603260' },
  constant: { color: '#C1392B' },
  placeholder: { color: '#888' },
});

const tagStyleMap = {
  TOKEN_NUMBER: tagStyles.number,
  TOKEN_FORMATTING_HINT: tagStyles.unit,
  TOKEN_PERCENTAGE: tagStyles.unit,
  TOKEN_PSEUDO_UNIT: tagStyles.unit,
  TOKEN_UNIT_NAME: tagStyles.unit,
  TOKEN_UNIT_PREFIX: tagStyles.unit,
  TOKEN_UNIT_SUFFIX: tagStyles.unit,
  TOKEN_OPERATOR_ADD: tagStyles.operator,
  TOKEN_OPERATOR_DIVIDE: tagStyles.operator,
  TOKEN_OPERATOR_EXPONENT: tagStyles.operator,
  TOKEN_OPERATOR_FACTORIAL: tagStyles.operator,
  TOKEN_OPERATOR_MULTIPLY: tagStyles.operator,
  TOKEN_OPERATOR_NEGATE: tagStyles.operator,
  TOKEN_OPERATOR_SUBTRACT: tagStyles.operator,
  TOKEN_COLOR: tagStyles.color,
  TOKEN_DATE_TIME: tagStyles.dateTime,
  TOKEN_FUNCTION: tagStyles.function,
  TOKEN_BRACKET_CLOSE: tagStyles.bracket,
  TOKEN_BRACKET_OPEN: tagStyles.bracket,
  TOKEN_CONSTANT: tagStyles.constant,
  placeholder: tagStyles.placeholder,
};


const SpanningElement = ({ children, type }) => (
  <Text style={tagStyleMap[type]}>
    {children}
  </Text>
);

const TextViewEntryContainer = ({ entry, result }) => (
  <Text>
    {entry}
  </Text>
);
    // <View>
    //   {result}
    // </View>

const TextViewEntry = ({ result, text }) => {
  // Recora strips out some noop tags from the start, middle and end,
  // but we need to actually show that text.
  let resultTokens = get('tokens', result) || [{ start: 0, end: text.length }];

  const lastEntryTag = last(resultTokens);
  if (lastEntryTag.end !== text.length) {
    resultTokens = concat(resultTokens, { start: lastEntryTag.end, end: text.length });
  }

  const { spanningElements } = reduce(({ index, spanningElements }, { start, end, type }) => {
    const preKey = `pre-${start}`;
    const key = `${start}-${end}`;

    const newSpanningElements = compact([
      start !== index
        ? <SpanningElement key={preKey}>{text.substring(index, start)}</SpanningElement>
        : null,
      <SpanningElement key={key} type={type}>{text.substring(start, end)}</SpanningElement>,
    ]);

    return {
      index: end,
      spanningElements: spanningElements.concat(newSpanningElements),
    };
  }, {
    index: 0,
    spanningElements: [],
  }, resultTokens);

  return <TextViewEntryContainer entry={spanningElements} result={get('pretty', result)} />;
};

const TextView = ({ textInputs, results, setTextInputs }) => {
  // Note above, if entries isn't ready yet, fake it with the text inputs (which will be ready)
  // This will mean that we'll see black text without results until entries is fully loaded, and
  // then it will adjust afterwards (without the page reflowing).

  const resultsWithText = results || map(text => ({ text }), textInputs);
  const values = map(index => (
    <TextViewEntry key={index} text={textInputs[index]} result={resultsWithText[index]} />
  ), keys(textInputs));

  return (
    <View>
      <TextInput
        style={{ width: 300, height: 300 }}
        placeholder="Type to begin calculation…"
        onChangeText={setTextInputs}
        multiline
      >
        {values}
      </TextInput>
    </View>
  );
};

export default connect(
  ({ sectionTextInputs, sectionResults }, { sectionId }) => ({
    textInputs: getOr([], sectionId, sectionTextInputs),
    results: get(sectionId, sectionResults),
  }),
  (dispatch, { sectionId }) => ({
    setTextInputs: text => dispatch(setTextInputs(sectionId, text.split('\n'))),
  })
)(TextView);
