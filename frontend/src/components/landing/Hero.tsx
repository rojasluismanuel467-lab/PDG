'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Outfit } from 'next/font/google';
import Spline from '@splinetool/react-spline';

const outfit = Outfit({ subsets: ['latin'] });

export default function Hero() {
    const onSplineLoad = useCallback((spline: any) => {
        try {
            if (spline._renderer) {
                spline._renderer.setClearColor(0x000000, 1);
            }
            if (spline._scene?.background) {
                spline._scene.background = null;
            }
        } catch (_) {}
    }, []);

    return (
        <div className="relative" style={{ backgroundColor: '#000000' }}>
            {/* Sticky scene */}
            <div className="sticky top-0 min-h-screen flex items-center overflow-hidden">

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 z-0 opacity-[0.06]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }}
                />

                {/* Spline 3D Scene */}
                <div className="absolute inset-0 z-[1] flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#000000' }}>
                    <Spline scene="https://prod.spline.design/ZvcocGHWhJSo7wHr/scene.splinecode" onLoad={onSplineLoad} />
                    {/* Cover Spline watermark */}
                    <div className="absolute bottom-0 right-0 w-[160px] h-[50px] md:w-[260px] md:h-[65px] z-[3]" style={{ backgroundColor: '#000000' }} />
                </div>

                {/* Text overlay */}
                <div className="container mx-auto px-6 md:px-12 relative z-10 pointer-events-none">
                    <div className="max-w-2xl">

                        {/* Badge pill */}
                        <div className="inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.10] rounded-full px-4 py-2 mb-10 backdrop-blur-sm pointer-events-auto">
                            <span className="h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />
                            <span className="text-white/80 text-sm font-medium">Agentes IA para arquitectura empresarial</span>
                            <span className="text-white/20">·</span>
                            <Link href="/consultor" className="text-white/60 text-sm hover:text-white flex items-center gap-1 transition-colors font-medium">
                                ver el prototipo <span>→</span>
                            </Link>
                        </div>

                        {/* Heading */}
                        <h1 className={`text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white leading-[1.1] mb-8 ${outfit.className}`}>
                            Automatiza tu<br />
                            arquitectura<br />
                            empresarial{' '}
                            <span className="text-gray-500">con agentes<br />de IA autónomos.</span>
                        </h1>

                        {/* CTAs */}
                        <div className="flex items-center gap-5 pointer-events-auto">
                            <Link
                                href="/consultor"
                                className="group inline-flex items-center gap-2.5 bg-white text-black px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all"
                            >
                                Ver prototipo
                                <span className="text-lg leading-none group-hover:rotate-45 transition-transform duration-300 inline-block">*</span>
                            </Link>
                            <Link
                                href="/signin"
                                className="text-white/40 text-sm hover:text-white/80 transition-colors"
                            >
                                Iniciar sesión →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll reveal space */}
            <div className="h-[40vh]" />
        </div>
    );
}
