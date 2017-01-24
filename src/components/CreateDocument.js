// @flow
import React, { Component } from 'react';
import { View, Text, TextInput, TouchableOpacity, Picker, Alert } from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { map, without } from 'lodash/fp';
import { addDocument } from '../redux';
import { button as buttonStyles } from '../styles';

class CreateDocument extends Component {
  constructor({ accounts }) {
    super();

    this.state = {
      filename: '',
      accountId: accounts[0],
    };
  }

  componentDidMount() {
    setTimeout(() => {
      if (this.textInput) this.textInput.focus();
    }, 50);
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
      this.props.addDocument(accountId, filename);
    } else {
      Alert.alert('You must set a document title to create a document');
    }
  }

  navigateAccountOnNewDocument = false
  textInput = null

  render() {
    const { accounts, accountNames, onClose } = this.props;
    const { filename, accountId } = this.state;

    return (
      <KeyboardAwareScrollView style={{ padding: 36, paddingTop: 60 }}>
        <TextInput
          ref={(textInput) => { this.textInput = textInput; }}
          style={{ fontSize: 36, height: 80 }}
          placeholder="Enter a Title"
          value={filename}
          onChangeText={this.setFilename}
          returnKeyType="done"
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
        <TouchableOpacity onPress={this.addAccount}>
          <View style={[buttonStyles.button, buttonStyles.border, buttonStyles.buttonBorder]}>
            <Text style={buttonStyles.buttonText}>CREATE DOCUMENT</Text>
          </View>
        </TouchableOpacity>
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
