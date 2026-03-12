from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.db.base import Base


class Pipe(Base):
    __tablename__ = "pipes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    pipe_type: Mapped[str] = mapped_column(String(64), nullable=False, default="污水")
    diameter_mm: Mapped[int] = mapped_column(Integer, nullable=False, default=400)
    start_manhole_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    end_manhole_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326))
