import bcrypt
from sqlalchemy import text

from app.core.database import SessionLocal


def seed_admin_password():
    db = SessionLocal()
    try:
        password = "Admin12345!"
        salt = bcrypt.gensalt()
        hashed_pwd = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

        query = text("UPDATE users SET password_hash = :pwd WHERE email = :email")
        result = db.execute(query, {"pwd": hashed_pwd, "email": "admin@arqdata.local"})
        db.commit()

        if result.rowcount and result.rowcount > 0:
            print("SUCCESS: Password hash updated for admin@arqdata.local")
            print(f"HASH: {hashed_pwd}")
        else:
            print("WARNING: admin@arqdata.local was not found. No row was updated.")
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin_password()
