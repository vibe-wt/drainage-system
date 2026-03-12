from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.db.base import Base


class Manhole(Base):
    __tablename__ = "manholes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    manhole_type: Mapped[str] = mapped_column(String(64), nullable=False, default="污水井")
    catchment_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    depth_m: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    geom = mapped_column(Geometry(geometry_type="POINT", srid=4326))
