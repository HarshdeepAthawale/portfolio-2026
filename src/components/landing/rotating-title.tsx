"use client";

import { useEffect, useState } from "react";
import { rotatingTitles } from "@/config/quote";

export function RotatingTitle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingTitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    // All titles share one grid cell, so the box is as tall as the longest title
    // (a fixed one-line height clipped wrapped titles on narrow phones).
    <div className="grid overflow-hidden">
      {rotatingTitles.map((title, i) => (
        <p
          key={title}
          aria-hidden={i !== index}
          className="col-start-1 row-start-1 text-[13px] font-medium text-secondary transition-all duration-700 ease-in-out sm:text-base sm:tracking-wide"
          style={{
            opacity: i === index ? 1 : 0,
            transform: i === index ? "translateY(0)" : "translateY(14px)",
            filter: i === index ? "blur(0)" : "blur(6px)",
          }}
        >
          {title}
        </p>
      ))}
    </div>
  );
}
