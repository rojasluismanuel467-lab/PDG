from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import RaciAssignmentType, RaciStatus
from app.models.raci import RaciActivity, RaciAssignment, RaciComment, RaciMatrix, RaciRole, RaciVersionHistory
from app.repositories.raci_repository import RaciRepository
from app.schemas.raci import (
    RaciActivityCreate,
    RaciActivityResponse,
    RaciAssignmentUpdate,
    RaciBulkUpdate,
    RaciCommentCreate,
    RaciCommentResponse,
    RaciGridResponse,
    RaciMatrixCreate,
    RaciMatrixResponse,
    RaciRoleCreate,
    RaciRoleResponse,
    RaciVersionHistoryResponse,
)

# Excepciones (Asumiendo que el proyecto tiene `NotFoundDomainError` y `ConflictDomainError` en app.exceptions.domain)
# Importamos genérico o adaptamos, usaré raise Exception si no existen para que sea funcional y el usuario los adapte.
# Por convención:
try:
    from app.exceptions.domain import ConflictDomainError, NotFoundDomainError
except ImportError:

    class NotFoundDomainError(Exception):
        pass

    class ConflictDomainError(Exception):
        pass


class RaciService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RaciRepository(db)

    # ---------------- #
    # Matrix           #
    # ---------------- #
    def create_matrix(self, data: RaciMatrixCreate) -> RaciMatrixResponse:
        matrix = RaciMatrix(
            project_id=data.project_id,
            entregable_id=data.entregable_id,
            name=data.name,
            description=data.description,
            status=RaciStatus.DRAFT,
        )
        matrix = self.repo.create_matrix(matrix)
        self.db.commit()
        self.db.refresh(matrix)
        return RaciMatrixResponse.model_validate(matrix)

    def list_matrices(self, project_id: UUID | None = None) -> list[RaciMatrixResponse]:
        if project_id:
            matrices = self.repo.list_matrices_by_project(project_id)
        else:
            # Si no hay project_id, podríamos listar todas o manejar error.
            # Por ahora listamos todas las no archivadas (necesitaría repo method o usar select genérico)
            stmt = select(RaciMatrix).where(RaciMatrix.status != RaciStatus.ARCHIVED)
            matrices = self.db.execute(stmt).scalars().all()

        return [RaciMatrixResponse.model_validate(m) for m in matrices]

    def get_grid(self, matrix_id: UUID) -> RaciGridResponse:
        matrix = self.repo.get_matrix_with_relations(matrix_id)
        if not matrix:
            raise NotFoundDomainError(f"RaciMatrix {matrix_id} no encontrada")

        roles_resp = [RaciRoleResponse.model_validate(r) for r in matrix.roles]

        actividades_resp = []
        for act in matrix.activities:
            # Construir dict de asignaciones: role_id -> RACI
            asig_dict = {}
            for asig in act.assignments:
                asig_dict[str(asig.role_id)] = asig.assignment_type.value

            act_resp = RaciActivityResponse(
                id=act.id,
                nombre=act.name,
                descripcion=act.description,
                categoria=act.category,
                notas=act.notas,
                asignaciones=asig_dict,
            )
            actividades_resp.append(act_resp)

        comentarios_resp = [RaciCommentResponse.model_validate(c) for c in matrix.comments]

        history_sorted = sorted(matrix.history, key=lambda h: h.created_at)
        history_resp = [RaciVersionHistoryResponse.model_validate(h) for h in history_sorted]

        return RaciGridResponse(
            id=matrix.id,
            proyecto_id=matrix.project_id,
            entregable_id=matrix.entregable_id,
            nombre=matrix.name,
            descripcion=matrix.description,
            version_actual=matrix.version_actual,
            created_at=matrix.created_at,
            updated_at=matrix.updated_at,
            roles=roles_resp,
            actividades=actividades_resp,
            comentarios=comentarios_resp,
            historial_versiones=history_resp,
        )

    # ---------------- #
    # Roles            #
    # ---------------- #
    def add_role(self, matrix_id: UUID, data: RaciRoleCreate) -> RaciRoleResponse:
        matrix = self.repo.get_matrix(matrix_id)
        if not matrix:
            raise NotFoundDomainError("Matriz no encontrada")

        role = RaciRole(
            matrix_id=matrix_id, name=data.name, area=data.area, description=data.description
        )
        role = self.repo.create_role(role)
        self.db.commit()
        self.db.refresh(role)
        return RaciRoleResponse.model_validate(role)

    # ---------------- #
    # Activities       #
    # ---------------- #
    def add_activity(self, matrix_id: UUID, data: RaciActivityCreate) -> RaciActivityResponse:
        matrix = self.repo.get_matrix(matrix_id)
        if not matrix:
            raise NotFoundDomainError("Matriz no encontrada")

        activity = RaciActivity(
            matrix_id=matrix_id,
            name=data.name,
            description=data.description,
            category=data.category,
            notas=data.notas,
        )
        activity = self.repo.create_activity(activity)
        self.db.commit()
        self.db.refresh(activity)

        # Opcional: validar y retornar sin asignaciones
        return RaciActivityResponse(
            id=activity.id,
            nombre=activity.name,
            descripcion=activity.description,
            categoria=activity.category,
            notas=activity.notas,
            asignaciones={},
        )

    # ---------------- #
    # Assignments      #
    # ---------------- #
    def update_assignments(
        self, matrix_id: UUID, activity_id: UUID, assignments: list[RaciAssignmentUpdate]
    ):
        """
        Regla principal: Sólo un 'A' por actividad.
        """
        activity = self.repo.get_activity_with_assignments(activity_id)
        if not activity or activity.matrix_id != matrix_id:
            raise NotFoundDomainError("Actividad no encontrada en esta matriz")

        current_assignments = {asig.role_id: asig for asig in activity.assignments}

        # Creamos la proyección de cómo quedaría el estado de asignaciones
        next_state = {}
        for role_id, asig in current_assignments.items():
            next_state[role_id] = asig.assignment_type

        # Aplicamos los cambios propuestos al estado proyectado
        for update in assignments:
            if update.assignment_type is None:
                next_state.pop(update.role_id, None)
            else:
                next_state[update.role_id] = update.assignment_type

        # Validar regla: Sólo un A por actividad
        a_count = sum(1 for val in next_state.values() if val == RaciAssignmentType.A)
        if a_count > 1:
            raise ConflictDomainError("No puede haber más de un Accountable (A) por actividad.")

        # Ejecutar los cambios en DB
        for update in assignments:
            # Borramos previo
            self.repo.delete_assignment_for_activity_and_role(activity_id, update.role_id)
            # Insertamos nuevo si no es None
            if update.assignment_type is not None:
                new_a = RaciAssignment(
                    matrix_id=matrix_id,
                    activity_id=activity_id,
                    role_id=update.role_id,
                    assignment_type=update.assignment_type,
                )
                self.repo.insert_assignment(new_a)

        self.db.commit()

    # ---------------- #
    def sync_bulk(self, matrix_id: UUID, data: RaciBulkUpdate, actor_nombre: str = "Usuario"):
        matrix = self.repo.get_matrix_with_relations(matrix_id)
        if not matrix:
            raise NotFoundDomainError("Matriz no encontrada")

        # 1. Metadatos básicos
        matrix.name = data.nombre
        matrix.description = data.descripcion

        existing_roles = {r.id: r for r in matrix.roles}
        existing_activities = {a.id: a for a in matrix.activities}

        valid_roles = set()

        # 2. Actualizar o crear roles
        for r_in in data.roles:
            if r_in.id in existing_roles:
                role = existing_roles[r_in.id]
                role.name = r_in.name
                role.area = r_in.area
                role.description = r_in.description
            else:
                role = RaciRole(
                    id=r_in.id,
                    matrix_id=matrix_id,
                    name=r_in.name,
                    area=r_in.area,
                    description=r_in.description,
                )
                self.repo.db.add(role)
            valid_roles.add(str(r_in.id))

        # Borrar roles huérfanos
        incoming_role_ids = {r.id for r in data.roles}
        for r_id, r in existing_roles.items():
            if r_id not in incoming_role_ids:
                self.repo.db.delete(r)

        # 3. Actualizar o crear actividades
        incoming_act_ids = {a.id for a in data.actividades}
        for a_in in data.actividades:
            if a_in.id in existing_activities:
                act = existing_activities[a_in.id]
                act.name = a_in.name
                act.description = a_in.description
                act.category = a_in.category
                act.notas = a_in.notas
                # Limpiamos sus asignaciones para reescribirlas
                for asig in list(act.assignments):
                    self.repo.db.delete(asig)
            else:
                act = RaciActivity(
                    id=a_in.id,
                    matrix_id=matrix_id,
                    name=a_in.name,
                    description=a_in.description,
                    category=a_in.category,
                    notas=a_in.notas,
                )
                self.repo.db.add(act)

            self.db.flush()  # Ejecutar borrados intermedios antes de recrear las asignaciones

            # Recrear asignaciones
            for role_id_str, asig_str in a_in.asignaciones.items():
                if role_id_str in valid_roles:
                    enum_val = next((e for e in RaciAssignmentType if e.value == asig_str), None)
                    if enum_val:
                        asig = RaciAssignment(
                            matrix_id=matrix_id,
                            activity_id=a_in.id,
                            role_id=UUID(role_id_str),
                            assignment_type=enum_val,
                        )
                        self.repo.db.add(asig)

        # Borrar actividades huérfanas
        for a_id, a in existing_activities.items():
            if a_id not in incoming_act_ids:
                self.repo.db.delete(a)

        # 4. Incrementar versión de forma robusta
        try:
            parts = matrix.version_actual.split(".")
            if len(parts) >= 2:
                major, minor = parts[0], parts[1]
                matrix.version_actual = f"{major}.{int(minor) + 1}"
            else:
                matrix.version_actual = f"{matrix.version_actual}.1"
        except (ValueError, AttributeError, IndexError):
            matrix.version_actual = "1.1"

        # 5. Registrar entrada en el historial
        history_entry = RaciVersionHistory(
            matrix_id=matrix_id,
            version=matrix.version_actual,
            autor=actor_nombre,
            descripcion_cambio=(
                f"Guardado: {len(data.actividades)} actividades, {len(data.roles)} roles"
            ),
            total_actividades=len(data.actividades),
            total_roles=len(data.roles),
        )
        self.db.add(history_entry)

        self.db.commit()

    # ---------------- #
    def add_comment(
        self,
        matrix_id: UUID,
        data: RaciCommentCreate,
        author_id: UUID,
        author_nombre: str,
        author_perfil: str,
    ) -> RaciCommentResponse:
        matrix = self.repo.get_matrix(matrix_id)
        if not matrix:
            raise NotFoundDomainError("Matriz no encontrada")

        comment = RaciComment(
            matrix_id=matrix_id,
            reference_id=data.referencia_id,
            reference_type=data.referencia_tipo,
            author_id=author_id,
            author_nombre=author_nombre,
            author_perfil=author_perfil,
            contenido=data.contenido,
            estado="abierto",
        )
        comment = self.repo.create_comment(comment)
        self.db.commit()
        self.db.refresh(comment)
        return RaciCommentResponse.model_validate(comment)
