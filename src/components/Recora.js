// @flow
import React, { Component } from 'react';
import { NavigatorIOS } from 'react-native';
import { connect } from 'react-redux';
import { get } from 'lodash/fp';
import DocumentList from './DocumentList';
import DocumentView from './DocumentView';
import AccountsList from './AccountsList';


class Recora extends Component {
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
    if (this.navigator) this.navigator.push(this.getRouteFor(documentId));
  }

  navigateAccounts = () => {
    if (this.navigator) {
      this.navigator.push({
        component: AccountsList,
        title: 'Accounts',
      });
    }
  }

  replaceDocument = (documentId) => {
    // FIXME: This does not work.
    const currentRoute = this.navigator.navigationContext.currentRoute;
    currentRoute.title = get(documentId, this.props.documentTitles);
    this.navigator.resetTo(currentRoute);
  }

  activeDocument = null;
  navigator = null;
  documentView = null;

  render() {
    return (
      <NavigatorIOS
        ref={navigator => { this.navigator = navigator; }}
        initialRoute={{
          component: DocumentList,
          passProps: {
            navigateDocument: this.navigateDocument,
            navigateAccounts: this.navigateAccounts,
          },
          navigationBarHidden: true,
          title: 'Documents',
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
)(Recora);
