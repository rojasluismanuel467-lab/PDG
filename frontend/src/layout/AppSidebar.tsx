"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import {
  BoltIcon,
  BoxCubeIcon,
  ChevronDownIcon,
  DocsIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  PieChartIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type MenuType = "main" | "project" | "gestion" | "cuenta";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

type SidebarSection = {
  type: MenuType;
  label: string;
  items: NavItem[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();

  const currentProjectIdMatch = pathname.match(/\/consultor\/proyectos\/([^/]+)/);
  const currentProjectId = currentProjectIdMatch?.[1] ?? null;
  const projectBase = currentProjectId ? `/consultor/proyectos/${currentProjectId}` : null;

  const sections = useMemo<SidebarSection[]>(() => {
    const perfil = user?.perfil;

    const cuentaSection: SidebarSection = {
      type: "cuenta",
      label: "Cuenta",
      items: [
        {
          icon: <UserCircleIcon />,
          name: "Cuenta",
          subItems: [
            { name: "Perfil", path: "/profile" },
            { name: "Cerrar Sesión", path: "/signin" },
          ],
        },
      ],
    };

    // ── ADMIN ────────────────────────────────────────────────────────────────
    if (perfil === "ADMIN") {
      return [
        {
          type: "main",
          label: "Gestión",
          items: [
            {
              icon: <BoxCubeIcon />,
              name: "Proyectos",
              path: "/consultor/proyectos",
            },
            {
              icon: <GroupIcon />,
              name: "Usuarios",
              path: "/usuarios",
            },
          ],
        },
        cuentaSection,
      ];
    }

    // ── CONSULTOR ────────────────────────────────────────────────────────────
    if (perfil === "CONSULTOR") {
      const result: SidebarSection[] = [
        {
          type: "main",
          label: "Menú",
          items: [
            {
              icon: <BoxCubeIcon />,
              name: "Mis Proyectos",
              path: "/consultor/proyectos",
            },
          ],
        },
      ];

      if (projectBase) {
        result.push({
          type: "project",
          label: "Proyecto activo",
          items: [
            {
              icon: <GridIcon />,
              name: "Vista General",
              path: projectBase,
            },
            {
              icon: <BoltIcon />,
              name: "Agente IA",
              path: `${projectBase}/agente`,
            },
            {
              icon: <PieChartIcon />,
              name: "Cuestionario de Madurez",
              path: `${projectBase}/cuestionario-madurez`,
            },
            {
              icon: <DocsIcon />,
              name: "Documentos",
              path: `${projectBase}/documento/A`,
            },
          ],
        });
      }

      result.push(
        {
          type: "gestion",
          label: "Gestión",
          items: [
            {
              icon: <GroupIcon />,
              name: "Equipo",
              path: "/consultor/usuarios",
            },
          ],
        },
        cuentaSection,
      );

      return result;
    }

    // ── EMPRESA ──────────────────────────────────────────────────────────────
    const result: SidebarSection[] = [
      {
        type: "main",
        label: "Menú",
        items: [
          {
            icon: <BoxCubeIcon />,
            name: "Mis Proyectos",
            path: "/consultor/proyectos",
          },
        ],
      },
    ];

    if (projectBase) {
      result.push({
        type: "project",
        label: "Proyecto activo",
        items: [
          {
            icon: <GridIcon />,
            name: "Vista del Proyecto",
            path: projectBase,
          },
          {
            icon: <PieChartIcon />,
            name: "Cuestionario de Madurez",
            path: `${projectBase}/cuestionario-madurez`,
          },
        ],
      });
    }

    result.push(cuentaSection);
    return result;
  }, [user?.perfil, projectBase]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: MenuType;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => pathname === path,
    [pathname],
  );

  useEffect(() => {
    let matchedSubmenu: { type: MenuType; index: number } | null = null;

    sections.forEach(({ type, items }) => {
      items.forEach((nav, index) => {
        nav.subItems?.forEach((sub) => {
          if (isActive(sub.path)) matchedSubmenu = { type, index };
        });
      });
    });

    const frame = window.requestAnimationFrame(() => {
      setOpenSubmenu((prev) => {
        if (!matchedSubmenu) return prev === null ? prev : null;
        if (prev?.type === matchedSubmenu.type && prev?.index === matchedSubmenu.index)
          return prev;
        return matchedSubmenu;
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sections, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: MenuType) => {
    setOpenSubmenu((prev) => {
      if (prev?.type === menuType && prev?.index === index) return null;
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: MenuType) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "rotate-180 text-white/70"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="ml-9 mt-2 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const logoHref =
    user?.perfil === "ADMIN" ? "/usuarios" : "/consultor/proyectos";

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-white/[0.06] bg-[#050505] px-5 text-gray-300 transition-all duration-300 ease-in-out lg:mt-0
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
      >
        <Link href={logoHref}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="AE Agent"
                width={148}
                height={32}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="AE Agent"
                width={148}
                height={32}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="AE Agent"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {sections.map(({ type, label, items }) => (
              <div key={type}>
                <h2
                  className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-500 ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? label : <HorizontaLDots />}
                </h2>
                {renderMenuItems(items, type)}
              </div>
            ))}
          </div>
        </nav>
        {(isExpanded || isHovered || isMobileOpen) && <SidebarWidget />}
      </div>
    </aside>
  );
};

export default AppSidebar;
