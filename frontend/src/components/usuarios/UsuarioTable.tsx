"use client";

import React from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Avatar from "@/components/ui/avatar/Avatar";
import type { UsuarioTableData } from "@/lib/types/usuarios.types";
import { User, Building2 } from "lucide-react";

interface UsuarioTableProps {
  usuarios: UsuarioTableData[];
  onEditar?: (usuario: UsuarioTableData) => void;
  onDesactivar?: (usuario: UsuarioTableData) => void;
}

/**
 * Tabla de usuarios reutilizando componentes UI existentes
 * Basado en BasicTableOne.tsx
 */
export const UsuarioTable: React.FC<UsuarioTableProps> = ({
  usuarios,
  onEditar,
  onDesactivar,
}) => {
  const getTipoIcon = (tipo: string) => {
    return tipo === "CONSULTOR" ? (
      <User className="w-4 h-4" />
    ) : (
      <Building2 className="w-4 h-4" />
    );
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "ACTIVO":
        return "success";
      case "INACTIVO":
        return "error";
      default:
        return "light";
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === "ADMINISTRADOR") return "error";
    return tipo === "CONSULTOR" ? "info" : "primary";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Usuario
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Tipo
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Estado
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Último Acceso
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  {/* Usuario */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center">
                        {usuario.avatar ? (
                          <Image
                            width={40}
                            height={40}
                            src={usuario.avatar}
                            alt={usuario.nombre}
                          />
                        ) : (
                          <span className="text-gray-400 dark:text-white/40">
                            {getTipoIcon(usuario.tipo_usuario)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {usuario.nombre}
                        </span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {usuario.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                {/* Tipo */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-white/40">
                      {getTipoIcon(usuario.tipo_usuario)}
                    </span>
                    <Badge
                      size="sm"
                      color={getTipoBadge(usuario.tipo_usuario)}
                    >
                      {usuario.tipo_usuario === "CONSULTOR" ? "Consultor" : usuario.tipo_usuario === "ADMINISTRADOR" ? "Administrador" : "Empresa"}
                    </Badge>
                  </div>
                </TableCell>

                  {/* Estado */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <Badge
                      size="sm"
                      color={usuario.estado === "ACTIVO" ? "success" : "error"}
                    >
                      {usuario.estado as string}
                    </Badge>
                  </TableCell>



                  {/* Último Acceso */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {usuario.ultimo_acceso_rel}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {onEditar && (
                        <button
                          onClick={() => onEditar(usuario)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                          title="Editar usuario"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600 dark:text-white/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      )}

                      {onDesactivar && (
                        <button
                          onClick={() => onDesactivar(usuario)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                          title="Desactivar"
                        >
                          <svg
                            className="w-4 h-4 text-orange-600 dark:text-orange-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
