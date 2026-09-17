"""数据库会话管理"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from contextlib import contextmanager

from config.settings import get_settings
from database.base import Base


def get_engine():
    """获取数据库引擎"""
    settings = get_settings()
    database_url = getattr(settings, 'database_url', 'sqlite:///./data/auth.db')

    if database_url.startswith('sqlite'):
        return create_engine(database_url, connect_args={"check_same_thread": False})
    else:
        return create_engine(database_url, pool_pre_ping=True, pool_size=10, max_overflow=20)


_engine = None
_SessionLocal = None


def init_db():
    """初始化数据库连接"""
    global _engine, _SessionLocal
    _engine = get_engine()
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def SessionLocal() -> Session:
    """创建并返回一个新的数据库会话"""
    if _SessionLocal is None:
        init_db()
    return _SessionLocal()


def get_db() -> Generator[Session, None, None]:
    """获取数据库会话（依赖注入）"""
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """获取数据库会话（上下文管理器）"""
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """创建所有表"""
    if _engine is None:
        init_db()

    # 导入模型以确保注册到 Base.metadata
    try:
        import gateway.models.user  # noqa: F401
    except ImportError:
        pass
    try:
        import gateway.models.department  # noqa: F401
    except ImportError:
        pass
    try:
        import gateway.models.knowledge  # noqa: F401
    except ImportError:
        pass
    try:
        import database.models.monitor_goal  # noqa: F401
    except ImportError:
        pass

    Base.metadata.create_all(bind=_engine)
