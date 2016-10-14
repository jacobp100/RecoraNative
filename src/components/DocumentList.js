// @flow
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { map } from 'lodash/fp';
import QuickCalculation from './QuickCalculation';
import TableRow from './TableRow';
import { addDocument, deleteAllDocuments } from '../redux';


const styles = StyleSheet.create({
  center: {
    alignSelf: 'center',
  },
  addDocumentContainer: {
    marginTop: 36,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgb(220, 28, 100)',
    borderRadius: 100,
    backgroundColor: 'white',
  },
  addDocumentText: {
    color: 'rgb(220, 28, 100)',
    fontSize: 10,
    fontWeight: '700',
  },
});

const DocumentList = ({
  documents,
  documentTitles,
  addDocument,
  deleteAllDocuments,
  navigateDocument,
}) => (
  <ScrollView style={{ flex: 1 }} keyboardDismissMode="interactive" showsVerticalScrollIndicator>
    <QuickCalculation />
    <View style={styles.center}>
      <TouchableOpacity onPress={addDocument}>
        <View style={styles.addDocumentContainer}>
          <Text style={styles.addDocumentText}>NEW DOCUMENT</Text>
        </View>
      </TouchableOpacity>
    </View>
    <View>
      {map(documentId => (
        <TableRow
          key={documentId}
          title={documentTitles[documentId]}
          onPress={() => navigateDocument(documentId)}
        />
      ), documents)}
    </View>
    <View style={{ marginTop: 36 }}>
      <TableRow title="Delete All Documents" onPress={deleteAllDocuments} />
    </View>
  </ScrollView>
);

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument, deleteAllDocuments }
)(DocumentList);
