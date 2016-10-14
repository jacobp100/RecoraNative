// @flow
import React, { Component } from 'react';
import { NavigatorIOS } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import { loadDocuments, loadDocument } from '../redux';
import DocumentList from './DocumentList';
import DocumentView from './DocumentView';


class Recora extends Component {
  constructor({ loadDocuments }) {
    super();
    loadDocuments();
  }

  navigator = null;

  navigateDocument = (documentId) => {
    if (!this.navigator) return;
    this.props.loadDocument(documentId);
    this.navigator.push({
      component: DocumentView,
      passProps: { documentId },
      title: get(documentId, this.props.documentTitles),
    });
  }

  render() {
    return (
      <NavigatorIOS
        ref={navigator => { this.navigator = navigator; }}
        initialRoute={{
          component: DocumentList,
          passProps: { navigateDocument: this.navigateDocument },
          navigationBarHidden: true,
          title: 'Recora',
        }}
        style={{ flex: 1 }}
      />
    );
  }
}

export default connect(
  state => ({
    documentTitles: state.documentTitles,
  }),
  { loadDocuments, loadDocument }
)(Recora);
