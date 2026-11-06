import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from 'react';
import { Animated, Image, PanResponder, Text, View } from 'react-native';
import { GripVertical, Heart } from 'lucide-react-native';
import { useDesignTokens } from '../../theme/DesignThemeContext';
import { createStyles } from '../../theme/createStyles';

const reverseAlphabetIndex = 'ZYXWVUTSRQPONMLKJIHGFEDCBA#'.split('');
const ascendingAlphabetIndex = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const playlistTrackRowHeight = 76;

export function PlaylistTrackRow({
  children,
  disabled,
  index,
  onMove,
  title,
  trackCount,
}: {
  children: ReactNode;
  disabled: boolean;
  index: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  title: string;
  trackCount: number;
}) {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const translateY = useRef(new Animated.Value(0)).current;
  const startIndex = useRef(index);
  const [isDragging, setIsDragging] = useState(false);
  const propsRef = useRef({ disabled, index, onMove, title, trackCount });
  propsRef.current = { disabled, index, onMove, title, trackCount };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !propsRef.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startIndex.current = propsRef.current.index;
          setIsDragging(true);
          translateY.setValue(0);
        },
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          const nextIndex = Math.max(
            0,
            Math.min(
              startIndex.current +
                Math.round(gesture.dy / playlistTrackRowHeight),
              propsRef.current.trackCount - 1,
            ),
          );
          translateY.setValue(0);
          setIsDragging(false);
          if (nextIndex !== startIndex.current) {
            propsRef.current.onMove(startIndex.current, nextIndex);
          }
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          setIsDragging(false);
        },
      }),
    [translateY],
  );

  return (
    <Animated.View
      style={[
        styles.trackRow,
        isDragging && styles.playlistTrackDragging,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.playlistReorderControls}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`Arrastrar ${title} para reordenar`}
          accessibilityHint="Arrastra verticalmente para cambiar la posición"
          accessibilityValue={{
            min: 0,
            max: Math.max(0, trackCount - 1),
            now: index,
          }}
          onAccessibilityAction={event => {
            const direction =
              event.nativeEvent.actionName === 'increment' ? 1 : -1;
            const nextIndex = Math.max(
              0,
              Math.min(index + direction, trackCount - 1),
            );
            if (!disabled && nextIndex !== index) {
              onMove(index, nextIndex);
            }
          }}
          {...responder.panHandlers}
          style={styles.playlistReorderHandle}
        >
          <GripVertical color={tokens.colors.accent} size={20} />
        </View>
      </View>
      {children}
    </Animated.View>
  );
}

export function Artwork({
  uri,
  size,
}: {
  uri: string | null | undefined;
  size: number;
}) {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  return (
    <View
      style={[
        styles.artwork,
        size >= 160 && styles.artworkLarge,
        { width: size, height: size },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.artworkImage} />
      ) : (
        <Text style={styles.artworkFallback}>♪</Text>
      )}
    </View>
  );
}

export function FavoriteSwipeRow({
  children,
  isFavorite,
  onToggleFavorite,
  trackTitle,
}: {
  children: ReactNode;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  trackTitle: string;
}) {
  const tokens = useDesignTokens();
  const { colors: themeColors } = tokens;
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const translateX = useRef(new Animated.Value(0)).current;
  const callbacks = useRef({ onToggleFavorite, isFavorite });
  callbacks.current = { onToggleFavorite, isFavorite };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 16 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > 16 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(Math.max(-100, Math.min(100, gesture.dx)));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) >= 72) {
            callbacks.current.onToggleFavorite();
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateX],
  );

  return (
    <View
      accessibilityHint="Desliza la canción para cambiar su estado de favorita"
      accessibilityLabel={`${trackTitle}${isFavorite ? ', favorita' : ''}`}
      style={styles.swipeTrackContainer}
    >
      <Animated.View
        style={[styles.favoriteSwipeReveal, gestureRevealStyle(translateX)]}
      >
        <Heart
          color={themeColors.onAccent}
          fill={isFavorite ? themeColors.onAccent : 'none'}
          size={20}
          strokeWidth={2}
        />
      </Animated.View>
      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.trackRow,
          {
            transform: [{ translateX }],
            backgroundColor: themeColors.background,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function gestureRevealStyle(translateX: Animated.Value): {
  opacity: Animated.AnimatedInterpolation<number>;
} {
  return {
    opacity: translateX.interpolate({
      inputRange: [-100, -40, 0, 40, 100],
      outputRange: [0.4, 0.4, 0, 0.4, 0.4],
      extrapolate: 'clamp',
    }),
  };
}

export function CurrentTrackIndicator({ isPlaying }: { isPlaying: boolean }) {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const bars = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.7),
    new Animated.Value(0.45),
  ]).current;

  useEffect(() => {
    if (!isPlaying) {
      bars.forEach(bar => bar.setValue(0.25));
      return;
    }
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 300 + index * 90,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.25,
            duration: 280 + index * 70,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [bars, isPlaying]);

  return (
    <View accessibilityLabel="Reproduciendo" style={styles.equalizerIndicator}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.equalizerBar,
            {
              backgroundColor: tokens.colors.accent,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function LibrarySkeleton() {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  return (
    <View accessibilityLabel="Cargando canciones" style={styles.skeletonList}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonArtwork} />
          <View style={styles.skeletonText}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function AlphabetScrubber({
  height,
  descending = false,
  onSelect,
}: {
  height: number;
  descending?: boolean;
  onSelect: (letter: string) => void;
}) {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedLetterY, setSelectedLetterY] = useState(0);
  const lastSelectedLetter = useRef<string | null>(null);
  const scrubberRef = useRef<ElementRef<typeof View>>(null);
  const scrubberTop = useRef(0);
  const onSelectRef = useRef(onSelect);
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.82)).current;
  const letters = descending ? reverseAlphabetIndex : ascendingAlphabetIndex;
  onSelectRef.current = onSelect;

  const selectAtY = useCallback(
    (y: number) => {
      if (height <= 0) {
        return;
      }
      const index = Math.max(
        0,
        Math.min(
          letters.length - 1,
          Math.floor(
            (Math.max(0, Math.min(height, y)) / height) * letters.length,
          ),
        ),
      );
      const letter = letters[index] ?? 'A';
      if (letter === lastSelectedLetter.current) {
        return;
      }
      lastSelectedLetter.current = letter;
      setSelectedLetter(letter);
      setSelectedLetterY(
        Math.max(
          0,
          Math.min(height - 34, (index / letters.length) * height - 17),
        ),
      );
      bubbleOpacity.stopAnimation();
      bubbleScale.stopAnimation();
      bubbleOpacity.setValue(0);
      bubbleScale.setValue(0.82);
      Animated.parallel([
        Animated.timing(bubbleOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1,
          damping: 15,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
      onSelectRef.current(letter);
    },
    [bubbleOpacity, bubbleScale, height, letters],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event, gesture) => {
          lastSelectedLetter.current = null;
          selectAtY(
            (gesture.moveY || event.nativeEvent.pageY) - scrubberTop.current,
          );
        },
        onPanResponderMove: (_event, gesture) => {
          selectAtY(gesture.moveY - scrubberTop.current);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          lastSelectedLetter.current = null;
          Animated.timing(bubbleOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              setSelectedLetter(null);
            }
          });
        },
        onPanResponderTerminate: () => {
          lastSelectedLetter.current = null;
          setSelectedLetter(null);
          bubbleOpacity.stopAnimation();
          bubbleOpacity.setValue(0);
        },
      }),
    [bubbleOpacity, selectAtY],
  );

  return (
    <View
      ref={scrubberRef}
      accessibilityRole="adjustable"
      accessibilityLabel="Índice alfabético de canciones"
      accessibilityHint="Desliza para saltar a una letra"
      onLayout={() => {
        scrubberRef.current?.measureInWindow((_x, y) => {
          scrubberTop.current = y;
        });
      }}
      {...responder.panHandlers}
      style={[styles.alphabetScrubber, { height }]}
    >
      {letters.map(letter => (
        <Text key={letter} style={styles.alphabetLetter}>
          {letter}
        </Text>
      ))}
      {selectedLetter ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.alphabetBubble,
            {
              top: selectedLetterY,
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }],
            },
          ]}
        >
          <Text style={styles.alphabetBubbleText}>{selectedLetter}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
