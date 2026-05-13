import asyncio
import uuid
from app.core.database import SessionLocal
from app.services.conceptual_model_service import ConceptualModelService
from app.models.user import User
from app.core.enums import UserType
from sqlalchemy import select

def main():
    db = SessionLocal()
    try:
        project_id = uuid.UUID("7587bbaf-2ed1-46e9-87f9-0024fa77846d")
        artifact_id = uuid.UUID("35aaebd9-de24-48dd-af2d-b4bab960ca3b")
        
        # Get an admin user
        admin = db.execute(select(User).where(User.tipo_usuario == UserType.ADMINISTRADOR)).scalars().first()
        if not admin:
            print("No admin found")
            return

        print(f"Calling list_versions for project {project_id}, artifact {artifact_id}, user {admin.id} ({admin.email})")
        response = ConceptualModelService.list_versions(
            db=db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=admin.id,
            actor_user_email=admin.email,
        )
        print("Success:", response.model_dump())
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
