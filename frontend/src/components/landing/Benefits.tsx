'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

interface BenefitCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    accent: string;
    delay: number;
}

function BenefitCard({ icon, title, description, accent, delay }: BenefitCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay);
                }
            },
            { threshold: 0.12 }
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <div
            ref={cardRef}
            className={`relative rounded-2xl p-7 border border-white/[0.08] bg-white/[0.03] transition-all duration-700 ease-out hover:bg-white/[0.05] hover:border-white/[0.14] group ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
        >
            {/* Top accent line */}
            <div
                className="absolute -top-px left-8 right-8 h-[1.5px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />

            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{
                    backgroundColor: `${accent}12`,
                    border: `1px solid ${accent}25`,
                }}
            >
                {icon}
            </div>

            <h3 className={`text-base font-semibold text-white mb-2 ${outfit.className}`}>
                {title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
                {description}
            </p>
        </div>
    );
}

/* ── Icons ── */
function IconLayers({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    );
}

function IconSearch({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
        </svg>
    );
}

function IconZap({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function IconRefresh({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    );
}

function IconFile({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    );
}

function IconNetwork({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <circle cx="19" cy="19" r="2" />
            <path d="M12 7v4M8.5 17.5L12 11M15.5 17.5L12 11" />
        </svg>
    );
}

const BRAND = '#ffffff';

const benefits = [
    {
        icon: <IconLayers color={BRAND} />,
        title: 'Modelado Automatizado',
        description: 'Genera modelos TOGAF, ArchiMate y diagramas de arquitectura empresarial de forma automática con inteligencia artificial.',
        accent: BRAND,
    },
    {
        icon: <IconSearch color={BRAND} />,
        title: 'Análisis de Impacto',
        description: 'Identifica dependencias y evalúa el impacto de cambios en tu arquitectura antes de implementarlos, reduciendo riesgos.',
        accent: BRAND,
    },
    {
        icon: <IconZap color={BRAND} />,
        title: 'Decisiones Más Rápidas',
        description: 'Obtén recomendaciones basadas en datos para tomar decisiones estratégicas de TI en minutos, no en semanas.',
        accent: BRAND,
    },
    {
        icon: <IconRefresh color={BRAND} />,
        title: 'Gobernanza Continua',
        description: 'Monitorea el cumplimiento de estándares y políticas de arquitectura empresarial en tiempo real, 24/7.',
        accent: BRAND,
    },
    {
        icon: <IconFile color={BRAND} />,
        title: 'Documentación Inteligente',
        description: 'Mantén tu repositorio de arquitectura siempre actualizado con documentación generada y validada por IA.',
        accent: BRAND,
    },
    {
        icon: <IconNetwork color={BRAND} />,
        title: 'Alineación Negocio-TI',
        description: 'Conecta objetivos de negocio con capacidades tecnológicas de forma visual y comprensible para todos los stakeholders.',
        accent: BRAND,
    },
];

export default function Benefits() {
    const titleRef = useRef<HTMLDivElement>(null);
    const [titleVisible, setTitleVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setTitleVisible(true); },
            { threshold: 0.1 }
        );
        if (titleRef.current) observer.observe(titleRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section id="benefits" className="relative z-20 overflow-hidden" style={{ backgroundColor: '#000000' }}>
            {/* Grid pattern */}
            <div
                className="absolute inset-0 z-0 opacity-[0.06]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Subtle glow at top */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(40,184,213,0.4), transparent)' }}
            />

            <div className="container mx-auto px-6 relative z-10 py-28">
                {/* Section header */}
                <div
                    ref={titleRef}
                    className={`text-center mb-20 transition-all duration-700 ease-out ${
                        titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                >
                    <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.10] rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        <span className="text-sm font-medium text-white/70 tracking-wide">Beneficios</span>
                    </div>

                    <h2 className={`text-4xl md:text-5xl lg:text-[56px] font-medium text-white tracking-tight mb-5 leading-[1.1] ${outfit.className}`}>
                        ¿Por qué un agente IA<br />
                        <span className="text-white/30">para arquitectura empresarial?</span>
                    </h2>
                    <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
                        Potencia tu práctica de Enterprise Architecture con inteligencia artificial que trabaja por ti.
                    </p>
                </div>

                {/* Cards grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefits.map((benefit, index) => (
                        <BenefitCard
                            key={index}
                            icon={benefit.icon}
                            title={benefit.title}
                            description={benefit.description}
                            accent={benefit.accent}
                            delay={index * 80}
                        />
                    ))}
                </div>

                {/* Bottom CTA strip */}
                <div className={`mt-20 text-center transition-all duration-700 delay-500 ${
                    titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    <p className="text-gray-600 text-sm mb-5">Listo para comenzar</p>
                    <a
                        href="/consultor"
                        className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        Ver el prototipo
                        <span className="text-lg">*</span>
                    </a>
                </div>
            </div>
        </section>
    );
}
