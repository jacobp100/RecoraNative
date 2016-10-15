// @flow
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import EntryStackView from './EntryStackView';
import EntryTextView from './EntryTextView';
import TotalRow from './TotalRow';

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
  sectionResults,
  sectionTotal,
}) => {
  const ready = Boolean(sectionResults);
  const totalElement = sectionTotal && <TotalRow ready={ready} total={sectionTotal} />;

  const titleElement = showSectionTitle && (
    <View>
      <Text style={styles.title}>{sectionTitle}</Text>
    </View>
  );

  const EntryComponent = portrait ? EntryStackView : EntryTextView;

  return (
    <View>
      {titleElement}
      <EntryComponent sectionId={sectionId} />
      {totalElement}
    </View>
  );
};

export default connect(
  ({ sectionTitles, sectionResults, sectionTotals }, { sectionId }) => ({
    sectionTitle: get(sectionId, sectionTitles),
    sectionResults: get(sectionId, sectionResults),
    sectionTotal: get(sectionId, sectionTotals),
  }),
  null,
  null,
  { pure: true }
)(Section);
