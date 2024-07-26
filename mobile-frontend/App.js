import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import Login from './Login';
import UserProfile from './UserProfile';
import Inbox from './Inbox';
import Settings from './Settings';
import Search from './Search';
import CreateAlbumList from './CreateAlbumList';
// import ViewAlbumList from './ViewAlbumList';
import AlbumPage from './AlbumPage';
import CreateArtistList from './CreateArtistList';
// import ViewArtistList from './ViewArtistList';
import ArtistPage from './ArtistPage';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
