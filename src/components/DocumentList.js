// @flow
import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { connect } from 'react-redux';
import { map } from 'lodash/fp';
import { addDocument, deleteAllDocuments } from '../redux';


// if (pagePreviews.length === 0) {
//   pagePreviews = <NoDocuments onAddDocument={addDocument} />;
// }
const DocumentList = ({
  documents,
  documentTitles,
  addDocument,
  deleteAllDocuments,
  navigateDocument,
}) => (
  <ScrollView style={{ flex: 1 }}>
    <TouchableOpacity onPress={addDocument}>
      <View>
        <Text>Add Document</Text>
      </View>
    </TouchableOpacity>
    <View>
      {map(documentId => (
        <TouchableOpacity key={documentId} onPress={() => navigateDocument(documentId)}>
          <View>
            <Text>{documentTitles[documentId]}</Text>
          </View>
        </TouchableOpacity>
      ), documents)}
    </View>
    <View style={{ height: 32 }} />
    <TouchableOpacity onPress={deleteAllDocuments}>
      <View style={{ backgroundColor: 'red' }}>
        <Text>Delete All Documents</Text>
      </View>
    </TouchableOpacity>
  </ScrollView>
);

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument, deleteAllDocuments }
)(DocumentList);
