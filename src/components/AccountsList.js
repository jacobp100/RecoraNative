// @flow
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { isEmpty, without } from 'lodash/fp';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SortableTable from './SortableTable';

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

const AddAccountButton = ({ children }) => (
  <TouchableOpacity>
    <View style={styles.addAccountButton}>
      <Text style={styles.addAccountButtonTitle}>{children}</Text>
    </View>
  </TouchableOpacity>
);

class AccountsList extends Component {
  state = {
    draggingTableItems: false,
  }

  startDraggingTableItems = () => this.setState({ draggingTableItems: true })
  endDraggingTableItems = () => this.setState({ draggingTableItems: false })
  toggleEditing = () => this.setState({ editingTableItems: !this.state.editingTableItems })

  render() {
    const { accounts, accountNames } = this.props;
    const { draggingTableItems } = this.state;
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
          <AddAccountButton>DropBox</AddAccountButton>
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
