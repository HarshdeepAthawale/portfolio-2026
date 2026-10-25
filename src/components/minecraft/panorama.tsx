"use client";

import { useEffect, useRef } from "react";

/** Six inward-facing world textures; the camera turns at the reference's 0.04 rad/s. */
export function Panorama({ reduced }: { reduced: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const motion = useRef(reduced);
  useEffect(() => { motion.current = reduced; }, [reduced]);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let stopped = false;
    let dispose: (() => void) | undefined;

    void import("three").then(THREE => {
      if (stopped) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power", alpha: false });
      } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.domElement.style.opacity = "0";
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, host.clientWidth / host.clientHeight, 0.1, 1000);
      const loader = new THREE.TextureLoader();
      let loaded = 0;
      let failed = false;
      const materials = [1, 3, 4, 5, 0, 2].map(n => {
        const texture = loader.load(`/minecraft/panorama/panorama_${n}_1k.jpg`, () => {
          if (!stopped) loaded++;
        }, undefined, () => { failed = true; });
        texture.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
      });
      const geometry = new THREE.BoxGeometry(100, 100, 100);
      scene.add(new THREE.Mesh(geometry, materials));
      let frame = 0;
      let last = performance.now();
      let elapsed = 0;
      let painted = false;
      const draw = (now: number) => {
        if (stopped || failed) return;
        if (now - last >= 32) {
          if (!document.hidden && loaded === 6 && (!motion.current || !painted)) {
            if (!motion.current) elapsed += Math.min(now - last, 100) / 1000;
            camera.rotation.y = elapsed * 0.04;
            camera.rotation.x = Math.sin(elapsed * 0.1) * 0.05;
            renderer.render(scene, camera);
            renderer.domElement.style.opacity = "1";
            painted = true;
          }
          last = now;
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      const resize = () => {
        if (!host.clientHeight) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
        painted = false;
      };
      window.addEventListener("resize", resize);
      const contextLost = () => { failed = true; renderer.domElement.style.opacity = "0"; };
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      dispose = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        geometry.dispose();
        materials.forEach(material => { material.map?.dispose(); material.dispose(); });
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
    return () => { stopped = true; dispose?.(); };
  }, []);

  return <div className="mc-panorama" ref={container} aria-hidden="true" />;
}
