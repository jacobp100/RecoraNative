// @flow
import React, { Component } from 'react';
import { ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { map, get } from 'lodash/fp';
import Section from './Section';

class Page extends Component {
  state = { isPortrait: true }

  onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const isPortrait = (width * 1.5) < height;
    this.setState({ isPortrait });
  }

  render() {
    const { sections } = this.props;
    const { isPortrait } = this.state;

    return (
      <ScrollView onLayout={this.onLayout} keyboardDismissMode="interactive">
        {map(sectionId => (
          <Section
            key={sectionId}
            sectionId={sectionId}
            portrait={isPortrait}
          />
        ), sections)}
      </ScrollView>
    );
  }
}

export default connect(
  ({ documentTitles, documentSections }, { documentId }) => ({
    // documentTitle: get(documentId, documentTitles),
    sections: get(documentId, documentSections),
  })
)(Page);
