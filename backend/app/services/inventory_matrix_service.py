from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectArtifactStatus
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.inventory_matrix import InventoryMatrix, InventoryMatrixVersion
from app.models.project_artifact import ProjectArtifact
from app.repositories.inventory_matrix_repository import InventoryMatrixRepository
from app.schemas.inventory_matrix import (
    AddInventoryCommentRequest,
    ComentarioInventarioResponse,
    InventoryMatrixResponse,
    InventoryMatrixSnapshotRequest,
    NivelCriticidad,
    SistemaInventarioSchema,
    TipoSistema,
    VersionInventarioResponse,
)
from app.services.project_permission_service import ProjectPermissionService


class InventoryMatrixService:
    ARTIFACT_CODE = "ASIS_SYSTEM_INVENTORY_MATRIX"

    @staticmethod
    def _version_label(version_number: int) -> str:
        return f"{version_number}.0"

    @staticmethod
    def _normalize(value: str) -> str:
        normalized = value.lower()
        return "".join(ch for ch in normalized if ch.isalnum())

    @staticmethod
    def _artifact_lock_check(artifact: ProjectArtifact) -> None:
        if artifact.status == ProjectArtifactStatus.APPROVED:
            raise ForbiddenDomainError("Artifact is approved and locked for edits")

    @classmethod
    def _resolve_artifact(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> ProjectArtifact:
        artifact = InventoryMatrixRepository.get_artifact(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if artifact is None:
            raise NotFoundDomainError("Project artifact not found")
        if artifact.code != cls.ARTIFACT_CODE:
            raise ValidationDomainError(f"Artifact code mismatch. Expected {cls.ARTIFACT_CODE}")
        return artifact

    @staticmethod
    def _resolve_permission(
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        artifact: ProjectArtifact,
        minimum_level: PermissionLevel,
    ) -> None:
        ProjectPermissionService.resolve_artifact_level(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=minimum_level,
        )

    @staticmethod
    def _map_versions(versions: list) -> list[VersionInventarioResponse]:
        ordered = sorted(versions, key=lambda v: v.version_number, reverse=True)
        result = []
        for v in ordered:
            snap = v.snapshot or {}
            total = len(snap.get("sistemas", []))
            result.append(
                VersionInventarioResponse(
                    version=InventoryMatrixService._version_label(v.version_number),
                    fecha=v.created_at,
                    autor=v.created_by_user_email,
                    descripcion_cambio=v.change_summary,
                    total_sistemas=total,
                )
            )
        return result

    @staticmethod
    def _map_comments(raw: list[dict]) -> list[ComentarioInventarioResponse]:
        return [ComentarioInventarioResponse.model_validate(c) for c in raw]

    @classmethod
    def _map_model(cls, model: InventoryMatrix) -> InventoryMatrixResponse:
        return InventoryMatrixResponse(
            id=model.id,
            proyecto_id=model.project_id,
            entregable_id=model.artifact_id,
            nombre=model.name,
            descripcion=model.description,
            sistemas=[SistemaInventarioSchema.model_validate(s) for s in (model.systems or [])],
            comentarios=cls._map_comments(model.comments or []),
            version_actual=cls._version_label(model.current_version_number),
            historial_versiones=cls._map_versions(model.versions),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @classmethod
    def _infer_tipo(cls, entity_name: str) -> TipoSistema:
        key = cls._normalize(entity_name)
        if any(tok in key for tok in ("db", "base", "store", "data", "warehouse", "lago")):
            return TipoSistema.BASE_DE_DATOS
        if any(tok in key for tok in ("etl", "pipeline", "integration", "bus", "plataform")):
            return TipoSistema.PLATAFORMA
        if any(tok in key for tok in ("server", "infra", "red", "network", "cloud")):
            return TipoSistema.INFRAESTRUCTURA
        return TipoSistema.APLICACION

    @classmethod
    def _infer_criticidad(cls, entity_name: str, attr_count: int) -> NivelCriticidad:
        key = cls._normalize(entity_name)
        if any(tok in key for tok in ("cliente", "cuenta", "transaccion", "pago", "core")):
            return NivelCriticidad.CRITICO
        if attr_count >= 8 or any(tok in key for tok in ("usuario", "producto", "orden")):
            return NivelCriticidad.ALTO
        return NivelCriticidad.MEDIO

    @classmethod
    def _generate_payload(cls, db: Session, *, project_id: uuid.UUID) -> dict:
        project = InventoryMatrixRepository.get_project(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")

        systems: list[dict] = []

        # Try to derive systems from AS-IS conceptual model
        from sqlalchemy import select

        from app.models.project_artifact import ProjectArtifact

        asis_artifact_stmt = select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.code == "ASIS_CONCEPTUAL_DIAGRAM",
        )
        asis_artifact = db.execute(asis_artifact_stmt).scalar_one_or_none()

        if asis_artifact:
            from sqlalchemy.orm import selectinload

            from app.models.conceptual_entity import ConceptualEntity
            from app.models.conceptual_model import ConceptualModel

            cm_stmt = (
                select(ConceptualModel)
                .options(
                    selectinload(ConceptualModel.entities).selectinload(ConceptualEntity.attributes)
                )
                .where(ConceptualModel.artifact_id == asis_artifact.id)
            )
            conceptual = db.execute(cm_stmt).scalar_one_or_none()
            if conceptual and conceptual.entities:
                for i, entity in enumerate(conceptual.entities[:6]):
                    tipo = cls._infer_tipo(entity.name)
                    criticidad = cls._infer_criticidad(entity.name, len(entity.attributes))
                    systems.append(
                        {
                            "id": f"sis-gen-{i + 1}",
                            "nombre": f"Sistema {entity.name}",
                            "tipo": tipo.value,
                            "descripcion": (
                                f"Sistema que gestiona datos de {entity.name} en el estado actual."
                            ),
                            "tecnologia": None,
                            "version": None,
                            "proveedor": None,
                            "propietario_negocio": None,
                            "propietario_tecnico": None,
                            "criticidad": criticidad.value,
                            "estado": "produccion",
                            "ambientes": ["Producción"],
                            "datos_que_maneja": [f"Datos de {entity.name}"],
                            "areas_estrategicas": None,
                            "notas": "Generado automáticamente. Revisar según diagnóstico real.",
                        }
                    )

        if not systems:
            systems = cls._fallback_systems(project.nombre)

        description = (
            f"Catálogo de sistemas y plataformas tecnológicas del ecosistema actual de "
            f"{project.client_company_name}. Generado automáticamente como punto de partida."
        )
        return {
            "nombre": f"Matriz de Inventario de Sistemas — {project.client_company_name}",
            "descripcion": description,
            "sistemas": systems,
        }

    @classmethod
    def _fallback_systems(cls, project_name: str) -> list[dict]:
        key = cls._normalize(project_name)
        if any(tok in key for tok in ("banco", "financ", "credito", "seguros")):
            entries = [
                ("Core Bancario", "base_de_datos", "IBM AS400 / Oracle", "critico"),
                ("CRM Clientes", "aplicacion", "Salesforce / Dynamics", "alto"),
                ("Portal Web y App Móvil", "aplicacion", "React / React Native", "alto"),
                ("DataWarehouse", "base_de_datos", "SQL Server / Redshift", "medio"),
            ]
        elif any(tok in key for tok in ("salud", "hospital", "clinica", "medic")):
            entries = [
                ("Historia Clínica Electrónica", "aplicacion", "Sistema HIS", "critico"),
                ("BD Pacientes", "base_de_datos", "Oracle Database", "critico"),
                ("Sistema de Farmacia", "aplicacion", "Software especializado", "alto"),
                ("Portal Pacientes", "aplicacion", "Web / Mobile", "medio"),
            ]
        elif any(tok in key for tok in ("retail", "tienda", "venta", "comercio")):
            entries = [
                ("ERP Ventas", "aplicacion", "SAP / Oracle ERP", "critico"),
                ("BD Productos", "base_de_datos", "PostgreSQL", "alto"),
                ("Portal E-Commerce", "aplicacion", "Shopify / Custom", "alto"),
                ("Plataforma ETL", "plataforma", "Informatica / Talend", "medio"),
            ]
        else:
            entries = [
                ("Sistema Core", "aplicacion", "Sistema principal de negocio", "critico"),
                ("Base de Datos Maestra", "base_de_datos", "PostgreSQL / Oracle", "critico"),
                ("Portal de Usuarios", "aplicacion", "Aplicación Web", "alto"),
                ("Plataforma ETL", "plataforma", "Herramienta de integración", "medio"),
            ]

        systems = []
        for i, (nombre, tipo, tecnologia, criticidad) in enumerate(entries):
            systems.append(
                {
                    "id": f"sis-gen-{i + 1}",
                    "nombre": nombre,
                    "tipo": tipo,
                    "descripcion": f"Sistema {nombre} del ecosistema actual de datos.",
                    "tecnologia": tecnologia,
                    "version": None,
                    "proveedor": None,
                    "propietario_negocio": None,
                    "propietario_tecnico": None,
                    "criticidad": criticidad,
                    "estado": "produccion",
                    "ambientes": ["Producción"],
                    "datos_que_maneja": ["Datos de negocio"],
                    "areas_estrategicas": None,
                    "notas": "Generado automáticamente. Revisar según diagnóstico real.",
                }
            )
        return systems

    @classmethod
    def _ensure_matrix(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> InventoryMatrix:
        model = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if model is not None:
            return model

        payload = cls._generate_payload(db, project_id=project_id)
        now = datetime.now(UTC)
        model = InventoryMatrixRepository.create_matrix(
            db,
            model=InventoryMatrix(
                project_id=project_id,
                artifact_id=artifact_id,
                name=payload["nombre"],
                description=payload["descripcion"],
                systems=payload["sistemas"],
                comments=[],
                current_version_number=1,
                created_by_user_id=actor_user_id,
                updated_by_user_id=actor_user_id,
                last_saved_at=now,
            ),
        )
        InventoryMatrixRepository.create_version(
            db,
            version=InventoryMatrixVersion(
                matrix_id=model.id,
                version_number=1,
                snapshot=payload,
                change_summary="Initial inventory matrix",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.flush()
        refreshed = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        return refreshed or model

    @classmethod
    def get_matrix(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> InventoryMatrixResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._ensure_matrix(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        db.commit()
        return cls._map_model(model)

    @classmethod
    def upsert_matrix(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
        payload: InventoryMatrixSnapshotRequest,
    ) -> InventoryMatrixResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        cls._artifact_lock_check(artifact)
        model = cls._ensure_matrix(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )

        model.name = payload.nombre
        model.description = payload.descripcion
        model.systems = [s.model_dump(mode="json") for s in payload.sistemas]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        InventoryMatrixRepository.create_version(
            db,
            version=InventoryMatrixVersion(
                matrix_id=model.id,
                version_number=model.current_version_number,
                snapshot=payload.model_dump(mode="json", exclude={"change_summary"}),
                change_summary=payload.change_summary or "Manual inventory matrix update.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.commit()
        refreshed = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Inventory matrix not found after save")
        return cls._map_model(refreshed)

    @classmethod
    def generate_matrix(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> InventoryMatrixResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        cls._artifact_lock_check(artifact)
        model = cls._ensure_matrix(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        generated = cls._generate_payload(db, project_id=project_id)
        model.name = generated["nombre"]
        model.description = generated["descripcion"]
        model.systems = generated["sistemas"]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        InventoryMatrixRepository.create_version(
            db,
            version=InventoryMatrixVersion(
                matrix_id=model.id,
                version_number=model.current_version_number,
                snapshot=generated,
                change_summary="Generated inventory matrix from AS-IS context.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.commit()
        refreshed = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Inventory matrix not found after generation")
        return cls._map_model(refreshed)

    @classmethod
    def add_comment(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        payload: AddInventoryCommentRequest,
    ) -> InventoryMatrixResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.COMENTAR,
        )

        model = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if model is None:
            raise NotFoundDomainError("Inventory matrix not found")

        user = InventoryMatrixRepository.get_user(db, user_id=actor_user_id)
        autor_nombre = user.nombre if user else str(actor_user_id)
        autor_perfil = user.tipo_usuario.value if user else "CONSULTOR"

        new_comment = {
            "id": f"com-inv-{uuid.uuid4().hex[:8]}",
            "referencia_id": payload.referencia_id,
            "referencia_tipo": payload.referencia_tipo,
            "campo": payload.campo,
            "autor_id": str(actor_user_id),
            "autor_nombre": autor_nombre,
            "autor_perfil": autor_perfil,
            "contenido": payload.contenido,
            "estado": "abierto",
            "created_at": datetime.now(UTC).isoformat(),
        }
        model.comments = [*(model.comments or []), new_comment]
        db.commit()
        refreshed = InventoryMatrixRepository.get_matrix(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Inventory matrix not found after comment")
        return cls._map_model(refreshed)
