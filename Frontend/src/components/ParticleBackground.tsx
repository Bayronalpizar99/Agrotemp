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
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth((prev) => {
          // Solo actualizamos si el ancho cambia (ej. rotar el celular)
          // Esto ignora los cambios de altura al hacer scroll en móviles
          if (prev !== window.innerWidth) {
            return window.innerWidth;
          }
          return prev;
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
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
        zIndex: -1,
      },
      background: {
        color: {
          value: "#171717",
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "bubble",
          },
          resize: {
            enable: false,
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
          // ✅ MEJORA: Se ajusta la velocidad a 1.
          speed: 1,
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
      manualParticles: particleLayout.map((point) => ({
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
      detectRetina: true,
    }),
    [particleLayout],
  );

  if (init) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', // Volvemos a vh, pero el contenedor fijo evita el problema
          zIndex: -1, 
          pointerEvents: 'none',
          backgroundColor: '#171717'
        }}
      >
        <Particles
          key={windowWidth}
          id="tsparticles"
          options={{
            ...particleOptions,
            fullScreen: { enable: true, zIndex: -1 }, // Reactivamos fullScreen
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return null;
});
