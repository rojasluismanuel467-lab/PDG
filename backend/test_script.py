import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.conceptual_model import ConceptualModel, ConceptualModelVersion
import logging

logging.basicConfig(level=logging.INFO)

def main():
    db = SessionLocal()
    try:
        versions = db.execute(select(ConceptualModelVersion)).scalars().all()
        for v in versions:
            print(f"Version ID: {v.id}, model_id: {v.model_id}, created_by_email: {getattr(v, 'created_by_user_email', None)}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
