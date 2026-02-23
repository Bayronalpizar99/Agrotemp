// src/components/ParticleBackground.tsx
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { memo, useEffect, useMemo, useState } from "react";
import { loadSlim } from "@tsparticles/slim";

type ParticleLayoutPoint = {
  x: number;
  y: number;
  size: number;
  opacity: number;
};

const PARTICLE_LAYOUT_KEY = "particle_layout_v1";
const PARTICLE_COUNT = 150;

const createParticleLayout = (): ParticleLayoutPoint[] =>
  Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random(),
    opacity: 0.1 + Math.random() * 0.2,
  }));

const loadOrCreateParticleLayout = (): ParticleLayoutPoint[] => {
  if (typeof window === "undefined") return createParticleLayout();

  try {
    const raw = window.localStorage.getItem(PARTICLE_LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ParticleLayoutPoint[];
      if (Array.isArray(parsed) && parsed.length === PARTICLE_COUNT) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse/storage errors and regenerate.
  }

  const freshLayout = createParticleLayout();
  try {
    window.localStorage.setItem(PARTICLE_LAYOUT_KEY, JSON.stringify(freshLayout));
  } catch {
    // Ignore storage write errors.
  }
  return freshLayout;
};

export const ParticleBackground = memo(function ParticleBackground() {
  const [init, setInit] = useState(false);
  const [particleLayout] = useState<ParticleLayoutPoint[]>(() => loadOrCreateParticleLayout());
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const touchQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const updateTouchMode = () => {
      setIsTouchDevice(touchQuery.matches);
    };

    updateTouchMode();

    if (typeof touchQuery.addEventListener === "function") {
      touchQuery.addEventListener("change", updateTouchMode);
      return () => {
        touchQuery.removeEventListener("change", updateTouchMode);
      };
    }

    touchQuery.addListener(updateTouchMode);
    return () => {
      touchQuery.removeListener(updateTouchMode);
    };
  }, []);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particleOptions: ISourceOptions = useMemo(
    () => ({
      fullScreen: {
        enable: true,
        zIndex: 0,
      },
      background: {
        color: {
          value: "#171717",
        },
      },
      fpsLimit: isTouchDevice ? 60 : 120,
      interactivity: {
        events: {
          onHover: {
            enable: !isTouchDevice,
            mode: "bubble",
          },
        },
        modes: {
          bubble: {
            distance: 80,
            duration: 2,
            opacity: 1,
            size: 3,
          },
        },
      },
      particles: {
        color: {
          value: "#ff8144",
        },
        links: {
          enable: false,
        },
        move: {
          direction: "top",
          enable: true,
          outModes: {
            default: "out",
          },
          // ✅ MEJORA: Se desactiva el movimiento aleatorio.
          random: false,
          speed: isTouchDevice ? 0.8 : 1,
          // ✅ MEJORA: Se fuerza el movimiento en línea recta.
          straight: true,
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 0,
        },
        opacity: {
          value: { min: 0.1, max: 0.3 },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 2 },
        },
      },
      manualParticles: particleLayout
        .slice(0, isTouchDevice ? 90 : PARTICLE_COUNT)
        .map((point) => ({
        position: {
          x: point.x,
          y: point.y,
        },
        options: {
          size: {
            value: point.size,
          },
          opacity: {
            value: point.opacity,
          },
        },
      })),
      detectRetina: !isTouchDevice,
    }),
    [isTouchDevice, particleLayout],
  );

  if (init) {
    return (
      <Particles
        id="tsparticles"
        options={particleOptions}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    );
  }

  return null;
});
