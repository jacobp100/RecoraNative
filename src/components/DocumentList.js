// @flow
import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { connect } from 'react-redux';
import { map } from 'lodash/fp';
import { addDocument } from '../redux';


// if (pagePreviews.length === 0) {
//   pagePreviews = <NoDocuments onAddDocument={addDocument} />;
// }
const DocumentList = ({
  documents,
  documentTitles,
  addDocument,
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
  </ScrollView>
);

export default connect(
  ({ documents, documentTitles }) => ({
    documents,
    documentTitles,
  }),
  { addDocument }
)(DocumentList);
