// @flow
import React, { Component } from 'react';
import { NavigatorIOS } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import { loadDocuments, loadDocument, setActiveDocument } from '../redux';
import DocumentList from './DocumentList';
import DocumentView from './DocumentView';


class Recora extends Component {
  constructor({ loadDocuments }) {
    super();
    loadDocuments();
  }

  onRightButtonPress = () => {
    if (this.documentView && this.documentView.onEdit) this.documentView.onEdit();
  }

  getRouteFor = (documentId) => ({
    component: props => <DocumentView
      ref={documentView => { this.documentView = documentView; }}
      {...props}
    />,
    passProps: {
      documentId,
      refreshRoute: () => this.replaceDocument(documentId),
    },
    title: get(documentId, this.props.documentTitles),
    rightButtonSystemIcon: 'edit',
    onRightButtonPress: this.onRightButtonPress,
  })

  navigateDocument = (documentId) => {
    if (!this.navigator) return;
    if (this.previousDocumentId) this.props.unloadDocument(this.previousDocumentId);
    this.props.loadDocument(documentId);
    this.props.setActiveDocument(documentId);
    this.navigator.push(this.getRouteFor(documentId));
  }

  replaceDocument = (documentId) => {
    // FIXME: This does not work.
    const currentRoute = this.navigator.navigationContext.currentRoute;
    currentRoute.title = get(documentId, this.props.documentTitles);
    this.navigator.resetTo(currentRoute);
  }

  navigator = null;
  documentView = null;
  previousDocumentId = null;

  render() {
    return (
      <NavigatorIOS
        ref={navigator => { this.navigator = navigator; }}
        initialRoute={{
          component: DocumentList,
          passProps: {
            navigateDocument: this.navigateDocument,
          },
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
  { loadDocuments, loadDocument, setActiveDocument }
)(Recora);
