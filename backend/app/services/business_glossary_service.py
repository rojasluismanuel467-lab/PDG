from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.enums import PermissionLevel, ProjectArtifactStatus
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.models.business_glossary import BusinessGlossary, BusinessGlossaryVersion
from app.models.project_artifact import ProjectArtifact
from app.repositories.business_glossary_repository import BusinessGlossaryRepository
from app.schemas.business_glossary import (
    AddGlossaryCommentRequest,
    BusinessGlossaryResponse,
    BusinessGlossarySnapshotRequest,
    ComentarioGlosarioResponse,
    TerminoGlosarioSchema,
    VersionGlosarioResponse,
)
from app.services.project_permission_service import ProjectPermissionService


class BusinessGlossaryService:
    ARTIFACT_CODE = "TOBE_BUSINESS_GLOSSARY"

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
        artifact = BusinessGlossaryRepository.get_artifact(
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
    def _map_versions(versions: list) -> list[VersionGlosarioResponse]:
        ordered = sorted(versions, key=lambda v: v.version_number, reverse=True)
        result = []
        for v in ordered:
            snap = v.snapshot or {}
            total = len(snap.get("terminos", []))
            result.append(
                VersionGlosarioResponse(
                    version=BusinessGlossaryService._version_label(v.version_number),
                    fecha=v.created_at,
                    autor=v.created_by_user_email,
                    descripcion_cambio=v.change_summary,
                    total_terminos=total,
                )
            )
        return result

    @staticmethod
    def _map_comments(raw: list[dict]) -> list[ComentarioGlosarioResponse]:
        return [ComentarioGlosarioResponse.model_validate(c) for c in raw]

    @classmethod
    def _map_model(cls, model: BusinessGlossary) -> BusinessGlossaryResponse:
        return BusinessGlossaryResponse(
            id=model.id,
            proyecto_id=model.project_id,
            entregable_id=model.artifact_id,
            nombre=model.name,
            descripcion=model.description,
            terminos=[TerminoGlosarioSchema.model_validate(t) for t in (model.terms or [])],
            comentarios=cls._map_comments(model.comments or []),
            version_actual=cls._version_label(model.current_version_number),
            historial_versiones=cls._map_versions(model.versions),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    @classmethod
    def _generate_payload(cls, db: Session, *, project_id: uuid.UUID) -> dict:
        project = BusinessGlossaryRepository.get_project(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")

        terms: list[dict] = []
        seen_names: set[str] = set()

        # Try TO-BE conceptual model entities
        tobe_artifact = BusinessGlossaryRepository.get_artifact_by_code(
            db, project_id=project_id, code="TOBE_CONCEPTUAL_DIAGRAM"
        )
        if tobe_artifact:
            conceptual = BusinessGlossaryRepository.get_conceptual_model_by_artifact(
                db, artifact_id=tobe_artifact.id
            )
            if conceptual and conceptual.entities:
                all_names = [e.name for e in conceptual.entities]
                for i, entity in enumerate(conceptual.entities[:8]):
                    if entity.name in seen_names:
                        continue
                    seen_names.add(entity.name)
                    related = [n for n in all_names if n != entity.name][:3]
                    terms.append(
                        {
                            "id": f"ter-gen-{i + 1}",
                            "termino": entity.name,
                            "definicion": (
                                f"Entidad de negocio que representa {entity.name} en la arquitectura "
                                f"TO-BE. Define su estructura, atributos clave y relaciones dentro del "
                                f"ecosistema de datos objetivo."
                            ),
                            "propietario": "Gerencia de Arquitectura de Datos",
                            "entidades_relacionadas": related,
                            "sinonimos": [],
                            "notas": "Generado automáticamente. Revisar y completar definición.",
                        }
                    )

        # Supplement with logical model tables if available
        if len(terms) < 5:
            logical_artifact = BusinessGlossaryRepository.get_artifact_by_code(
                db, project_id=project_id, code="TOBE_LOGICAL_DATA_MODEL"
            )
            if logical_artifact:
                logical = BusinessGlossaryRepository.get_logical_model_by_artifact(
                    db, artifact_id=logical_artifact.id
                )
                if logical and logical.tables:
                    for i, table in enumerate(logical.tables[:6]):
                        name = str(table.get("entidad_origen") or table.get("nombre") or "")
                        if not name or name in seen_names:
                            continue
                        seen_names.add(name)
                        terms.append(
                            {
                                "id": f"ter-log-{i + 1}",
                                "termino": name,
                                "definicion": (
                                    f"Concepto de negocio representado por la tabla {name} en el "
                                    f"modelo lógico TO-BE."
                                ),
                                "propietario": "Gerencia de Arquitectura de Datos",
                                "entidades_relacionadas": [],
                                "sinonimos": [],
                                "notas": "Derivado del modelo lógico. Completar definición.",
                            }
                        )

        if not terms:
            terms = cls._fallback_terms(project.nombre)

        description = (
            f"Diccionario estandarizado de términos de negocio para la arquitectura TO-BE de "
            f"{project.client_company_name}. Generado automáticamente como punto de partida."
        )
        return {
            "nombre": f"Glosario de Negocio TO-BE — {project.client_company_name}",
            "descripcion": description,
            "terminos": terms,
        }

    @classmethod
    def _fallback_terms(cls, project_name: str) -> list[dict]:
        key = cls._normalize(project_name)
        if any(tok in key for tok in ("banco", "financ", "credito")):
            entries = [
                (
                    "Cliente Único",
                    "Representación canónica y consolidada de un cliente en el ecosistema TO-BE.",
                    ["Cuenta", "Producto"],
                ),
                (
                    "Cuenta",
                    "Contrato financiero que registra derechos y obligaciones entre la entidad y el cliente.",
                    ["Cliente Único", "Transacción"],
                ),
                (
                    "Transacción",
                    "Operación atómica e inmutable que modifica el estado de una o más cuentas.",
                    ["Cuenta", "Canal"],
                ),
                (
                    "Producto Financiero",
                    "Servicio financiero contratado por un cliente con ciclo de vida propio.",
                    ["Cliente Único", "Cuenta"],
                ),
                (
                    "Canal",
                    "Medio a través del cual el cliente interactúa con la entidad en el TO-BE.",
                    ["Transacción", "Cliente Único"],
                ),
            ]
        else:
            entries = [
                (
                    "Entidad Maestra",
                    "Objeto de negocio de alto valor cuya información es compartida por múltiples sistemas.",
                    ["Proceso", "Canal"],
                ),
                (
                    "Proceso de Negocio",
                    "Secuencia de actividades que genera valor y produce datos en el ecosistema.",
                    ["Entidad Maestra"],
                ),
                (
                    "Calidad de Dato",
                    "Dimensiones que determinan si un dato es apto para uso en decisiones de negocio.",
                    ["Entidad Maestra"],
                ),
                (
                    "Pipeline de Datos",
                    "Flujo automatizado de extracción, transformación y carga de datos entre sistemas.",
                    ["Entidad Maestra"],
                ),
                (
                    "Indicador Clave (KPI)",
                    "Métrica cuantificable que mide el desempeño de la arquitectura de datos.",
                    ["Proceso de Negocio"],
                ),
            ]

        terms = []
        for i, (termino, definicion, relacionadas) in enumerate(entries):
            terms.append(
                {
                    "id": f"ter-gen-{i + 1}",
                    "termino": termino,
                    "definicion": definicion,
                    "propietario": "Gerencia de Arquitectura de Datos",
                    "entidades_relacionadas": relacionadas,
                    "sinonimos": [],
                    "notas": "Generado automáticamente. Revisar y completar definición.",
                }
            )
        return terms

    @classmethod
    def _ensure_glossary(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> BusinessGlossary:
        model = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if model is not None:
            return model

        payload = cls._generate_payload(db, project_id=project_id)
        now = datetime.now(UTC)
        model = BusinessGlossaryRepository.create_glossary(
            db,
            model=BusinessGlossary(
                project_id=project_id,
                artifact_id=artifact_id,
                name=payload["nombre"],
                description=payload["descripcion"],
                terms=payload["terminos"],
                comments=[],
                current_version_number=1,
                created_by_user_id=actor_user_id,
                updated_by_user_id=actor_user_id,
                last_saved_at=now,
            ),
        )
        BusinessGlossaryRepository.create_version(
            db,
            version=BusinessGlossaryVersion(
                glossary_id=model.id,
                version_number=1,
                snapshot=payload,
                change_summary="Initial business glossary",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.flush()
        refreshed = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        return refreshed or model

    @classmethod
    def get_glossary(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> BusinessGlossaryResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.LECTURA,
        )
        model = cls._ensure_glossary(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        db.commit()
        return cls._map_model(model)

    @classmethod
    def upsert_glossary(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
        payload: BusinessGlossarySnapshotRequest,
    ) -> BusinessGlossaryResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        cls._artifact_lock_check(artifact)
        model = cls._ensure_glossary(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )

        model.name = payload.nombre
        model.description = payload.descripcion
        model.terms = [t.model_dump(mode="json") for t in payload.terminos]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        BusinessGlossaryRepository.create_version(
            db,
            version=BusinessGlossaryVersion(
                glossary_id=model.id,
                version_number=model.current_version_number,
                snapshot=payload.model_dump(mode="json", exclude={"change_summary"}),
                change_summary=payload.change_summary or "Manual business glossary update.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.commit()
        refreshed = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Business glossary not found after save")
        return cls._map_model(refreshed)

    @classmethod
    def generate_glossary(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_email: str,
    ) -> BusinessGlossaryResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.EDITAR,
        )
        cls._artifact_lock_check(artifact)
        model = cls._ensure_glossary(
            db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=actor_user_id,
            actor_user_email=actor_user_email,
        )
        generated = cls._generate_payload(db, project_id=project_id)
        model.name = generated["nombre"]
        model.description = generated["descripcion"]
        model.terms = generated["terminos"]
        model.current_version_number += 1
        model.updated_by_user_id = actor_user_id
        model.last_saved_at = datetime.now(UTC)

        BusinessGlossaryRepository.create_version(
            db,
            version=BusinessGlossaryVersion(
                glossary_id=model.id,
                version_number=model.current_version_number,
                snapshot=generated,
                change_summary="Generated glossary from TO-BE context.",
                created_by_user_id=actor_user_id,
                created_by_user_email=actor_user_email,
            ),
        )
        db.commit()
        refreshed = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Business glossary not found after generation")
        return cls._map_model(refreshed)

    @classmethod
    def add_comment(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        payload: AddGlossaryCommentRequest,
    ) -> BusinessGlossaryResponse:
        artifact = cls._resolve_artifact(db, project_id=project_id, artifact_id=artifact_id)
        cls._resolve_permission(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            artifact=artifact,
            minimum_level=PermissionLevel.COMENTAR,
        )

        model = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if model is None:
            raise NotFoundDomainError("Business glossary not found")

        user = BusinessGlossaryRepository.get_user(db, user_id=actor_user_id)
        autor_nombre = user.nombre if user else str(actor_user_id)
        autor_perfil = user.tipo_usuario.value if user else "CONSULTOR"

        new_comment = {
            "id": f"com-glos-{uuid.uuid4().hex[:8]}",
            "referencia_id": payload.referencia_id,
            "referencia_tipo": payload.referencia_tipo,
            "autor_id": str(actor_user_id),
            "autor_nombre": autor_nombre,
            "autor_perfil": autor_perfil,
            "contenido": payload.contenido,
            "estado": "abierto",
            "created_at": datetime.now(UTC).isoformat(),
        }
        model.comments = [*(model.comments or []), new_comment]
        db.commit()
        refreshed = BusinessGlossaryRepository.get_glossary(
            db, project_id=project_id, artifact_id=artifact_id
        )
        if refreshed is None:
            raise NotFoundDomainError("Business glossary not found after comment")
        return cls._map_model(refreshed)
