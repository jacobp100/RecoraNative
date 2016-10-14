// @flow
import React from 'react';
import { View, ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { map } from 'lodash/fp';
import QuickCalculation from './QuickCalculation';
import TableRow from './TableRow';
import { addDocument, deleteAllDocuments } from '../redux';


const DocumentList = ({
  documents,
  documentTitles,
  addDocument,
  deleteAllDocuments,
  navigateDocument,
}) => (
  <ScrollView style={{ flex: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator>
    <QuickCalculation />
    <View style={{ height: 32 }} />
    <TableRow title="Add Document" onPress={addDocument} />
    <View>
      {map(documentId => (
        <TableRow
          key={documentId}
          title={documentTitles[documentId]}
          onPress={() => navigateDocument(documentId)}
        />
      ), documents)}
    </View>
    <View style={{ height: 32 }} />
    <TableRow title="Delete All Documents" onPress={deleteAllDocuments} />
  </ScrollView>
);

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument, deleteAllDocuments }
)(DocumentList);
