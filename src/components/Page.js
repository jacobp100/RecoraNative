// @flow
import React from 'react';
import { ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { map, get } from 'lodash/fp';
import Section from './Section';

const Page = ({ sections }) => (
  <ScrollView>
    {map(sectionId => (
      <Section
        key={sectionId}
        sectionId={sectionId}
      />
    ), sections)}
  </ScrollView>
);

export default connect(
  ({ documentTitles, documentSections }, { documentId }) => ({
    // documentTitle: get(documentId, documentTitles),
    sections: get(documentId, documentSections),
  })
)(Page);
