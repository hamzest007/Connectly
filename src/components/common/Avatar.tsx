import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  initials: string;
  color?: string;
  size?: number;
  avatarUrl?: string;
};

export function Avatar({
  initials,
  color = '#2563EB',
  size = 42,
  avatarUrl,
}: Props) {
  const [sourceUrl, setSourceUrl] = React.useState(avatarUrl);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    setSourceUrl(avatarUrl);
    setFailed(false);
  }, [avatarUrl]);
  return sourceUrl && !failed ? (
    <Image
      source={{ uri: sourceUrl }}
      resizeMode="cover"
      onError={() => {
        setFailed(true);
      }}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  ) : (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFF', fontWeight: '800' },
});
