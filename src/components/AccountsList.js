// @flow
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, NativeModules } from 'react-native';
import { connect } from 'react-redux';
import { isEmpty, without, flow, toPairs, map, join, mapValues } from 'lodash/fp';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SortableTable from './SortableTable';
import AuthenticationModal, { redirectUri } from './AuthenticationModal';

const styles = StyleSheet.create({
  addAccountContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  addAccountButton: {
    justifyContent: 'flex-end',
    width: 100,
    height: 64,
    marginHorizontal: 6,
    padding: 12,
    borderColor: 'rgb(220, 28, 100)',
    borderWidth: 1,
    borderRadius: 8,
  },
  addAccountButtonTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgb(220, 28, 100)',
  },
  title: {
    fontSize: 12,
    marginTop: 32,
    marginBottom: 18,
    marginHorizontal: 12,
  },
  noAccounts: {
    fontSize: 18,
    textAlign: 'center',
    color: '#ccc',
    marginVertical: 18,
  },
});

const AddAccountButton = ({ onPress, children }) => (
  <TouchableOpacity onPress={onPress}>
    <View style={styles.addAccountButton}>
      <Text style={styles.addAccountButtonTitle}>{children}</Text>
    </View>
  </TouchableOpacity>
);

const MODAL_NONE = 0;
const MODAL_DROPBOX = 1;

const getUri = (url, params) => `${url}?${flow(
  mapValues(encodeURIComponent),
  toPairs,
  map(join('=')),
  join('&')
)(params)}`;

const modalUris = {
  [MODAL_DROPBOX]: getUri('https://www.dropbox.com/oauth2/authorize', {
    response_type: 'token',
    client_id: 'w0683mxt3cgd5vq',
    redirect_uri: redirectUri,
  }),
};

const authenticationParameters = {
  [MODAL_DROPBOX]: 'access_token',
};

class AccountsList extends Component {
  state = {
    draggingTableItems: false,
    modal: MODAL_NONE,
  }

  setModal = modal => () => {
    console.log(NativeModules.OAuth);
    console.log(NativeModules);
    NativeModules.OAuth.authenticate('https://google.com');
  };
  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })
  toggleEditing = () => this.setState({ editingTableItems: !this.state.editingTableItems })

  render() {
    const { accounts, accountNames } = this.props;
    const { draggingTableItems, modal } = this.state;
    return (
      <KeyboardAwareScrollView scrollEnabled={!draggingTableItems}>
        <Text style={styles.title}>
          Add Account
        </Text>
        <ScrollView
          style={styles.addAccountContainer}
          showsHorizontalScrollIndicator={false}
          horizontal
        >
          <AddAccountButton onPress={this.setModal(MODAL_DROPBOX)}>DropBox</AddAccountButton>
          <AddAccountButton>Google Drive</AddAccountButton>
          <AddAccountButton>One Drive</AddAccountButton>
        </ScrollView>
        <Text style={styles.title}>
          Accounts
        </Text>
        {isEmpty(accounts) ? (
          <Text style={styles.noAccounts}>
            No Accounts
          </Text>
        ) : (
          <SortableTable
            rows={accounts}
            rowTitles={accountNames}
            onDragStart={this.startDraggingTableItems}
            onDragEnd={this.endDraggingTableItems}
            onRowPress={this.navigateDocument}
            onDeletePress={() => {}}
            onOrderChange={() => {}}
            isEditing
          />
        )}
        <AuthenticationModal
          uri={modalUris[modal]}
          visible={Boolean(modal)}
        />
      </KeyboardAwareScrollView>
    );
  }
}

export default connect(
  state => ({
    accounts: without(['localStorage1'], state.accounts),
    accountNames: state.accountNames,
    accountTypes: state.accountTypes,
  })
)(AccountsList);
