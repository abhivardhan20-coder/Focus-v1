import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const COLORS = [
  "#13EC5B", "#A855F7", "#3B82F6", "#F97316", "#06B6D4",
  "#FBBF24", "#EC4899", "#ffffff", "#10B981", "#F43F5E",
];
const PARTICLE_COUNT = 52;

interface Particle {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotationEnd: number;
  isCircle: boolean;
  swayRange: number;
}

function genParticles(screenW: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * screenW,
    size: 5 + Math.random() * 9,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 700,
    duration: 1300 + Math.random() * 900,
    rotationEnd: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    isCircle: Math.random() > 0.6,
    swayRange: (Math.random() - 0.5) * 60,
  }));
}

interface Props {
  onDone?: () => void;
}

export function ConfettiCelebration({ onDone }: Props) {
  const { width: screenW, height: screenH } = Dimensions.get("window");
  const particles = useMemo(() => genParticles(screenW), [screenW]);

  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerY = useRef(new Animated.Value(-24)).current;
  const bannerScale = useRef(new Animated.Value(0.88)).current;

  const particleAnims = useRef(
    particles.map(() => ({
      y: new Animated.Value(-16),
      x: new Animated.Value(0),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Banner animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.timing(bannerY, { toValue: 0, duration: 260, useNativeDriver: false }),
        Animated.timing(bannerScale, { toValue: 1, duration: 260, useNativeDriver: false }),
      ]),
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 0, duration: 340, useNativeDriver: false }),
        Animated.timing(bannerY, { toValue: -20, duration: 340, useNativeDriver: false }),
      ]),
    ]).start();

    // Particle animations
    const particleAnimations = particles.map((p, i) => {
      const anim = particleAnims[i];
      return Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: screenH + 30,
            duration: p.duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim.x, {
            toValue: p.swayRange,
            duration: p.duration,
            useNativeDriver: false,
          }),
          Animated.timing(anim.rotate, {
            toValue: p.rotationEnd,
            duration: p.duration,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.delay(p.duration * 0.65),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: p.duration * 0.35,
              useNativeDriver: false,
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(particleAnimations).start(() => {
      onDone?.();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Particles */}
      {particles.map((p, i) => {
        const rotateStr = particleAnims[i].rotate.interpolate({
          inputRange: [-360, 0, 360],
          outputRange: ["-360deg", "0deg", "360deg"],
          extrapolate: "extend",
        });
        return (
          <Animated.View
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: particleAnims[i].y,
              width: p.size,
              height: p.isCircle ? p.size : p.size * 0.55,
              backgroundColor: p.color,
              borderRadius: p.isCircle ? p.size / 2 : 2,
              opacity: particleAnims[i].opacity,
              transform: [
                { translateX: particleAnims[i].x },
                { rotate: rotateStr },
              ],
            }}
          />
        );
      })}

      {/* "All done!" banner */}
      <Animated.View
        style={[
          styles.banner,
          {
            opacity: bannerOpacity,
            transform: [
              { translateY: bannerY },
              { scale: bannerScale },
            ],
          },
        ]}
      >
        <Text style={styles.bannerEmoji}>🎉</Text>
        <Text style={styles.bannerText}>All done today!</Text>
        <Text style={styles.bannerEmoji}>🎉</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(19, 236, 91, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(19, 236, 91, 0.45)",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 32,
  },
  bannerEmoji: {
    fontSize: 22,
  },
  bannerText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
});
