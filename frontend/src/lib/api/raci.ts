import { apiClient } from "@/lib/api/client";
import type { MatrizRaci, RolRaci, ActividadRaci } from "@/lib/types/matriz-raci.types";

export interface RaciAssignmentUpdatePayload {
  role_id: string;
  assignment_type: "R" | "A" | "C" | "I" | null;
}

export const raciApi = {
  // Listar matrices por proyecto
  async listByProject(projectId: string): Promise<MatrizRaci[]> {
    const { data } = await apiClient.get<MatrizRaci[]>("/raci-matrices/", {
      params: { project_id: projectId }
    });
    return data;
  },

  // Crear matriz inicial vacía
  async createMatrix(projectId: string, entregableId?: string): Promise<MatrizRaci> {
    const { data } = await apiClient.post<MatrizRaci>("/raci-matrices/", {
      project_id: projectId,
      entregable_id: entregableId || null,
      nombre: "Matriz RACI Creada Automáticamente",
      descripcion: "Matriz en blanco generada para este entregable.",
    });
    return data;
  },

  // Obtener la matriz completa (GRID)
  async getGrid(matrixId: string): Promise<MatrizRaci> {
    const { data } = await apiClient.get<MatrizRaci>(`/raci-matrices/${matrixId}/grid`);
    return data;
  },

  async saveFullMatrix(matriz: MatrizRaci): Promise<MatrizRaci> {
    const matrixId = matriz.id;
    // Guardar usando el endpoint bulk que acepta todo y reconstruye DB atómicamente
    await apiClient.put(`/raci-matrices/${matrixId}`, {
      nombre: matriz.nombre,
      descripcion: matriz.descripcion,
      roles: matriz.roles,
      actividades: matriz.actividades
    });
    
    // Retornamos el grid fresco desde BD
    return this.getGrid(matrixId);
  },
  
  // Agregamos métodos atómicos que el frontend pudiese usar "on the fly"
  async createRole(matrixId: string, role: Partial<RolRaci>): Promise<RolRaci> {
    const { data } = await apiClient.post<RolRaci>(`/raci-matrices/${matrixId}/roles`, {
      nombre: role.nombre,
      descripcion: role.descripcion,
      area: role.area,
    });
    return data;
  },
  
  async createActivity(matrixId: string, activity: Partial<ActividadRaci>): Promise<ActividadRaci> {
    const { data } = await apiClient.post<ActividadRaci>(`/raci-matrices/${matrixId}/activities`, {
      nombre: activity.nombre,
      descripcion: activity.descripcion,
      categoria: activity.categoria,
      notas: activity.notas,
    });
    return data;
  },

  async updateAssignments(matrix_id: string, activity_id: string, assignments: RaciAssignmentUpdatePayload[]): Promise<void> {
    await apiClient.put(`/raci-matrices/${matrix_id}/activities/${activity_id}/assignments`, assignments);
  },

  async addComment(matrixId: string, comment: any): Promise<void> {
    await apiClient.post(`/raci-matrices/${matrixId}/comments`, comment);
  }
};
