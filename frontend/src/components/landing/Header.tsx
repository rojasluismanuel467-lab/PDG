'use client';

import React from 'react';
import Link from 'next/link';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
            {/* Logo */}
            <Link href="/">
                <div className="w-9 h-9 bg-white/[0.08] border border-white/[0.15] rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.14]">
                    <span className={`text-white text-xl font-bold leading-none mt-0.5 ${outfit.className}`}>*</span>
                </div>
            </Link>

            {/* Center nav pill */}
            <nav className="hidden md:flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full px-1.5 py-1 backdrop-blur-md">
                <NavLink href="#benefits">Beneficios</NavLink>
                <NavLink href="#how-it-works">Cómo funciona</NavLink>
                <NavLink href="#features">Características</NavLink>
                <NavLink href="#security">Seguridad</NavLink>
                <NavLink href="#faq">FAQ</NavLink>
                <NavLink href="#contact">Contacto</NavLink>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
                <Link
                    href="/consultor"
                    className="text-white/40 hover:text-white/80 text-sm transition-colors hidden sm:block"
                >
                    Ver demo
                </Link>
                <Link
                    href="/signin"
                    className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                    Acceder
                </Link>
            </div>
        </header>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="text-white/40 hover:text-white/80 px-3.5 py-2 rounded-full text-sm transition-all hover:bg-white/[0.05]"
        >
            {children}
        </Link>
    );
}
