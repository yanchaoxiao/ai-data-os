"""User ORM 模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean

from database.base import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(64), unique=True, nullable=False, index=True)
    email         = Column(String(128), unique=True, nullable=True)
    password_hash = Column(String(256), nullable=False)
    role          = Column(String(32), nullable=False, default="user")
    department_id = Column(Integer, nullable=True)
    is_active     = Column(Boolean, nullable=False, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
