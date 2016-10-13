// @flow
import React from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import EntryStackView from './EntryStackView';
import TotalRow from './TotalRow';

const Section = ({ sectionId, sectionTitle, sectionResults, sectionTotal }) => {
  const ready = Boolean(sectionResults);
  const totalElement = sectionTotal && <TotalRow ready={ready} total={sectionTotal} />;

  const titleElement = sectionTitle && (
    <View>
      <Text>{sectionTitle}</Text>
    </View>
  );

  return (
    <View>
      {titleElement}
      <EntryStackView sectionId={sectionId} />
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
