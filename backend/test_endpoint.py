import asyncio
import uuid
from app.core.database import SessionLocal
from app.services.conceptual_model_service import ConceptualModelService
from app.models.user import User
from sqlalchemy import select

def main():
    db = SessionLocal()
    try:
        project_id = uuid.UUID("7587bbaf-2ed1-46e9-87f9-0024fa77846d")
        artifact_id = uuid.UUID("35aaebd9-de24-48dd-af2d-b4bab960ca3b")
        
        # Get a user (maybe consultor)
        user = db.execute(select(User).where(User.email == "consultor@test.com")).scalar_one_or_none()
        if not user:
            print("No user found")
            return

        print(f"Calling list_versions for project {project_id}, artifact {artifact_id}, user {user.id}")
        response = ConceptualModelService.list_versions(
            db=db,
            project_id=project_id,
            artifact_id=artifact_id,
            actor_user_id=user.id,
            actor_user_email=user.email,
        )
        print("Success:", response.model_dump())
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
