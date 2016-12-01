// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, TouchableOpacity, Picker, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { map, without } from 'lodash/fp';
import { addDocument } from '../redux';
import { button as buttonStyles } from '../styles';

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.15,
  },
});

class CreateDocument extends Component {
  constructor({ accounts }) {
    super();

    this.state = {
      filename: '',
      accountId: accounts[0],
    };
  }

  componentDidUpdate(prevProps) {
    if (!this.navigateAccountOnNewDocument) return;
    const newDocuments = without(prevProps.documents, this.props.documents);
    if (newDocuments.length !== 1) return;
    this.navigateAccountOnNewDocument = false;
    this.props.onDocumentCreated(newDocuments[0]);
  }

  setFilename = filename => this.setState({ filename })
  setAccountId = accountId => this.setState({ accountId })
  addAccount = () => {
    const { filename, accountId } = this.state;
    if (filename && accountId) {
      this.navigateAccountOnNewDocument = true;
      this.props.addDocument(filename, accountId);
    }
  }

  navigateAccountOnNewDocument = false

  render() {
    const { accounts, accountNames, onClose } = this.props;
    const { filename, accountId } = this.state;

    const createDocumentButtonBody = (
      <View style={[buttonStyles.button, buttonStyles.border, buttonStyles.buttonBorder]}>
        <Text style={buttonStyles.buttonText}>CREATE DOCUMENT</Text>
      </View>
    );

    return (
      <KeyboardAwareScrollView style={{ padding: 36, paddingTop: 60 }}>
        <TextInput
          style={{ fontSize: 36, height: 80 }}
          placeholder="Title"
          value={filename}
          onChangeText={this.setFilename}
        />
        <Picker selectedValue={accountId} onValueChange={this.setAccountId}>
          {map(accountId => (
            <Picker
              key={accountId}
              label={accountNames[accountId]}
              value={accountId}
            />
          ), accounts)}
        </Picker>
        {(filename && accountId) ? (
          <TouchableOpacity onPress={this.addAccount}>{createDocumentButtonBody}</TouchableOpacity>
        ) : (
          <View style={styles.disabled}>{createDocumentButtonBody}</View>
        )}
        <TouchableOpacity onPress={onClose}>
          <View style={buttonStyles.button}>
            <Text style={buttonStyles.buttonText}>CANCEL</Text>
          </View>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    );
  }
}

export default connect(
  ({ documents, accounts, accountNames }) => ({
    documents,
    accounts,
    accountNames,
  }),
  { addDocument }
)(CreateDocument);
