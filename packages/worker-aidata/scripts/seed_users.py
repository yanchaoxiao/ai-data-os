"""幂等种子脚本：创建 admin/testuser"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.session import SessionLocal, create_tables
from gateway.models.user import User
from gateway.auth.password_handler import hash_password


def seed():
    """创建默认用户"""
    create_tables()

    db = SessionLocal()
    try:
        users = [
            User(username="admin", password_hash=hash_password("admin123"), role="admin"),
            User(username="testuser", password_hash=hash_password("test123"), role="user"),
        ]

        for user in users:
            existing = db.query(User).filter(User.username == user.username).first()
            if not existing:
                db.add(user)
                print(f"Created user: {user.username}")
            else:
                print(f"User already exists: {user.username}")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
