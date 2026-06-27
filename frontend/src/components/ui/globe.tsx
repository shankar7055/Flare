"use client"

import { useEffect, useRef } from "react"
import createGlobe, { type COBEOptions } from "cobe"
import { useMotionValue, useSpring } from "motion/react"
import { Highlighter } from "./highligher"

import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400

const GLOBE_CONFIG: COBEOptions = {
    width: 1980, // Significantly increased internal resolution
    height: 1980,
    onRender: () => { },
    devicePixelRatio: 2,

    phi: 0,
    theta: 0.3,

    dark: 0, // Changed back to 0 to make the globe body white
    diffuse: 1.2,

    mapSamples: 25000, // Slightly bumped samples for clarity at a larger scale
    mapBrightness: 6,

    baseColor: [1, 1, 1],
    markerColor: [251 / 255, 100 / 255, 21 / 255],
    glowColor: [1, 1, 1],

    markers: [
        { location: [14.5995, 120.9842], size: 0.03 },
        { location: [19.076, 72.8777], size: 0.10 },
        { location: [23.8103, 90.4125], size: 0.05 },
        { location: [30.0444, 31.2357], size: 0.07 },
        { location: [39.9042, 116.4074], size: 0.08 },
        { location: [-23.5505, -46.6333], size: 0.10 },
        { location: [19.4326, -99.1332], size: 0.10 },
        { location: [40.7128, -74.006], size: 0.10 },
        { location: [34.6937, 135.5022], size: 0.05 },
        { location: [41.0082, 28.9784], size: 0.06 },
    ],
}

export function Globe({
    className,
    config = GLOBE_CONFIG,
}: {
    className?: string
    config?: COBEOptions
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const phiRef = useRef(0)
    const widthRef = useRef(0)
    const pointerInteracting = useRef<number | null>(null)
    const pointerInteractionMovement = useRef(0)

    const r = useMotionValue(0)
    const rs = useSpring(r, {
        mass: 1,
        damping: 30,
        stiffness: 100,
    })

    const updatePointerInteraction = (value: number | null) => {
        pointerInteracting.current = value
        if (canvasRef.current) {
            canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
        }
    }

    const updateMovement = (clientX: number) => {
        if (pointerInteracting.current !== null) {
            const delta = clientX - pointerInteracting.current
            pointerInteractionMovement.current = delta
            r.set(r.get() + delta / MOVEMENT_DAMPING)
        }
    }

    useEffect(() => {
        const onResize = () => {
            if (canvasRef.current) {
                widthRef.current = canvasRef.current.offsetWidth
            }
        }

        window.addEventListener("resize", onResize)
        onResize()

        const globe = createGlobe(canvasRef.current!, {
            ...config,
            width: widthRef.current * 2,
            height: widthRef.current * 2,
            onRender: (state) => {
                if (!pointerInteracting.current) phiRef.current += 0.005
                state.phi = phiRef.current + rs.get()
                state.width = widthRef.current * 2
                state.height = widthRef.current * 2
            },
        })

        setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0)
        return () => {
            globe.destroy()
            window.removeEventListener("resize", onResize)
        }
    }, [rs, config])

    return (
        <div
            className={cn(
                "absolute bottom-0 left-1/2 h-[760px] w-full max-w-[1320px] -translate-x-1/2 overflow-hidden",
                className
            )}
        >
            {/* Adjusted text container with better sizing and spacing */}
            <div className="relative z-10 pt-24 text-center max-w-4xl mx-auto px-4">
                <p className="font-['Syne',sans-serif] text-3xl md:text-4xl font-extrabold uppercase tracking-wide text-zinc-950 leading-[1.3]">
                    Stop{" "}
                    <Highlighter action="underline" color="#FF9800">
                        missing deadlines.
                    </Highlighter>{" "}
                    Let an <br />
                    <Highlighter action="highlight" color="#87CEFA">
                        agent handle it.
                    </Highlighter>
                </p>
            </div>

            {/* Globe Canvas pushed lower down to top-[180px] */}
            <canvas
                ref={canvasRef}
                className="absolute left-1/2 top-[180px] h-[1320px] w-[1320px] -translate-x-1/2 opacity-0 transition-opacity duration-500 cursor-grab active:cursor-grabbing"
                style={{
                    width: "1320px",
                    height: "1320px",
                }}
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX;
                    updatePointerInteraction(e.clientX);
                }}
                onPointerUp={() => updatePointerInteraction(null)}
                onPointerLeave={() => updatePointerInteraction(null)}
                onMouseMove={(e) => updateMovement(e.clientX)}
                onTouchMove={(e) => {
                    if (e.touches[0]) {
                        updateMovement(e.touches[0].clientX);
                    }
                }}
            />
        </div>
    );
}