// @flow
import React, { Component } from 'react';
import { View } from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { map, getOr } from 'lodash/fp';
import Section from './Section';

class Page extends Component {
  state = { isPortrait: true }

  onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const isPortrait = (width * 1.5) < height;
    this.setState({ isPortrait });
  }

  render() {
    const { sections, children } = this.props;
    const { isPortrait } = this.state;
    const showSectionTitle = sections.length > 1;

    return (
      <View onLayout={this.onLayout} style={{ flex: 1 }}>
        <KeyboardAwareScrollView>
          {map(sectionId => (
            <Section
              key={sectionId}
              sectionId={sectionId}
              portrait={isPortrait}
              showSectionTitle={showSectionTitle}
            />
          ), sections)}
          {children}
        </KeyboardAwareScrollView>
      </View>
    );
  }
}

export default connect(
  ({ documentTitles, documentSections }, { documentId }) => ({
    // documentTitle: get(documentId, documentTitles),
    sections: getOr([], documentId, documentSections),
  })
)(Page);
