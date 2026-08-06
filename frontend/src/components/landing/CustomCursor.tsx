"use client";

import { useEffect, useRef } from "react";

/**
 * Replaces the system cursor with a small solid dot plus a softer,
 * slower-trailing glow. The caller is responsible for only mounting
 * this on devices with a real mouse (pointer: fine) and when motion
 * isn't reduced - see SignInGate, which gates rendering and also
 * applies the matching `cursor: none` class.
 *
 * `loading` swaps the dot for a spinning ring, used while the landing
 * page's own loading screen is up and while the sign-in form is
 * submitting, so the cursor itself communicates "busy" without a
 * separate spinner stealing attention.
 */
export function CustomCursor({ loading = false }: { loading?: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const glowPos = useRef({ x: -100, y: -100 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      pos.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("pointermove", handleMove);

    function tick() {
      // Glow eases toward the pointer more slowly than the dot, which
      // is what gives it a soft trailing feel rather than a rigid one.
      glowPos.current.x += (pos.current.x - glowPos.current.x) * 0.12;
      glowPos.current.y += (pos.current.y - glowPos.current.y) * 0.12;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glowPos.current.x}px, ${glowPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden="true">
      <div
        ref={glowRef}
        className="absolute left-0 top-0 rounded-full blur-xl transition-[width,height,opacity] duration-300"
        style={{
          width: loading ? 64 : 44,
          height: loading ? 64 : 44,
          background:
            "radial-gradient(circle, rgba(123,112,245,0.55) 0%, rgba(242,153,74,0.25) 55%, transparent 75%)",
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 rounded-full transition-[width,height] duration-200"
        style={{ width: loading ? 18 : 8, height: loading ? 18 : 8 }}
      >
        {loading ? (
          <div className="w-full h-full rounded-full border-[1.5px] border-chalk/80 border-t-transparent animate-spin" />
        ) : (
          <div className="w-full h-full rounded-full bg-chalk" />
        )}
      </div>
    </div>
  );
}
