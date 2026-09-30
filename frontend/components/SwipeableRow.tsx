import { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = -40;

export function SwipeableRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(-ACTION_WIDTH, base + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0;
        const finalX = Math.min(0, Math.max(-ACTION_WIDTH, base + gesture.dx));
        const shouldOpen = finalX < OPEN_THRESHOLD;
        openRef.current = shouldOpen;
        Animated.spring(translateX, {
          toValue: shouldOpen ? -ACTION_WIDTH : 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  const close = () => {
    openRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.actionUnderlay}>
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            close();
            onDelete();
          }}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  actionUnderlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: colors.bad,
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteActionText: { color: '#fff', fontWeight: '700' },
});
