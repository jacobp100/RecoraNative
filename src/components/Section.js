// @flow
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import EntryStackView from './EntryStackView';
import EntryTextView from './EntryTextView';

const styles = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

const Section = ({
  portrait,
  showSectionTitle,
  sectionId,
  sectionTitle,
}) => {
  const titleElement = showSectionTitle && (
    <View style={{ backgroundColor: portrait ? '#f8f8f8' : 'white' }}>
      <Text style={styles.title}>{sectionTitle}</Text>
    </View>
  );

  const EntryComponent = portrait ? EntryStackView : EntryTextView;

  return (
    <View>
      {titleElement}
      <EntryComponent sectionId={sectionId} />
    </View>
  );
};

export default connect(
  ({ sectionTitles, sectionResults, sectionTotals }, { sectionId }) => ({
    sectionTitle: get(sectionId, sectionTitles),
  }),
  null,
  null,
  { pure: true }
)(Section);
