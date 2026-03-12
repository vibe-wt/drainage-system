from __future__ import annotations

from copy import deepcopy
from math import hypot
from typing import Any
from uuid import uuid4

MapObject = dict[str, Any]

STATIC_MAP_OBJECTS: dict[str, list[MapObject]] = {
    "outfalls": [
        {
            "id": "outfall_001",
            "code": "OF-001",
            "name": "东南排口",
            "object_type": "outfall",
            "risk_level": "medium",
            "status": "active",
            "properties": {"outfall_type": "污水排口", "receiving_water": "南港河"},
            "geom": {"type": "Point", "coordinates": [120.0172, 30.9975]},
        }
    ],
    "pump_stations": [
        {
            "id": "ps_001",
            "code": "PS-001",
            "name": "云栖提升泵站",
            "object_type": "pump_station",
            "risk_level": "low",
            "status": "active",
            "properties": {"pump_station_type": "污水提升", "capacity_m3d": 18000},
            "geom": {"type": "Point", "coordinates": [120.0123, 31.0022]},
        }
    ],
    "plots": [
        {
            "id": "plot_001",
            "code": "PL-001",
            "name": "云栖花园小区",
            "object_type": "plot",
            "risk_level": "high",
            "status": "active",
            "properties": {"plot_type": "小区", "water_usage_m3d": 540, "cod_baseline": 430},
            "geom": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [120.0049, 31.0024],
                        [120.0099, 31.0024],
                        [120.0099, 31.0000],
                        [120.0049, 31.0000],
                        [120.0049, 31.0024],
                    ]
                ],
            },
        },
        {
            "id": "plot_002",
            "code": "PL-002",
            "name": "新港工业园",
            "object_type": "plot",
            "risk_level": "low",
            "status": "active",
            "properties": {"plot_type": "工业", "water_usage_m3d": 960, "cod_baseline": 520},
            "geom": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [120.0118, 31.0000],
                        [120.0173, 31.0000],
                        [120.0173, 30.9971],
                        [120.0118, 30.9971],
                        [120.0118, 31.0000],
                    ]
                ],
            },
        },
    ],
    "catchments": [
        {
            "id": "catchment_001",
            "code": "CT-001",
            "name": "云栖花园片区",
            "object_type": "catchment",
            "risk_level": "high",
            "status": "active",
            "properties": {"catchment_type": "分析片区", "score": 0.91},
            "geom": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [120.0044, 31.0030],
                        [120.0105, 31.0030],
                        [120.0105, 30.9995],
                        [120.0044, 30.9995],
                        [120.0044, 31.0030],
                    ]
                ],
            },
        },
        {
            "id": "catchment_002",
            "code": "CT-002",
            "name": "新港工业园片区",
            "object_type": "catchment",
            "risk_level": "medium",
            "status": "active",
            "properties": {"catchment_type": "分析片区", "score": 0.47},
            "geom": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [120.0110, 31.0006],
                        [120.0184, 31.0006],
                        [120.0184, 30.9966],
                        [120.0110, 30.9966],
                        [120.0110, 31.0006],
                    ]
                ],
            },
        },
    ],
    "monitoring_points": [
        {
            "id": "mp_001",
            "code": "MP-001",
            "name": "云栖在线监测点",
            "object_type": "monitoring_point",
            "risk_level": "high",
            "status": "active",
            "properties": {
                "monitor_type": "水质",
                "linked_object_type": "manhole",
                "linked_object_id": "mh_002",
                "cod": 182,
                "last_observed_at": "2026-03-11T09:30:00+08:00",
            },
            "geom": {"type": "Point", "coordinates": [120.0091, 31.0008]},
        },
        {
            "id": "mp_002",
            "code": "MP-002",
            "name": "工业园在线监测点",
            "object_type": "monitoring_point",
            "risk_level": "low",
            "status": "active",
            "properties": {
                "monitor_type": "水质",
                "linked_object_type": "pipe",
                "linked_object_id": "pipe_002",
                "cod": 468,
                "last_observed_at": "2026-03-11T09:35:00+08:00",
            },
            "geom": {"type": "Point", "coordinates": [120.0136, 30.9992]},
        },
    ],
    "task_areas": [
        {
            "id": "task_area_001",
            "code": "TA-001",
            "name": "云栖外水排查范围",
            "object_type": "task_area",
            "risk_level": "high",
            "status": "in_progress",
            "properties": {"priority": "high", "owner": "项目经理 A"},
            "geom": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [120.0050, 31.0027],
                        [120.0101, 31.0027],
                        [120.0101, 30.9998],
                        [120.0050, 30.9998],
                        [120.0050, 31.0027],
                    ]
                ],
            },
        }
    ],
}

INITIAL_MANHOLES: list[MapObject] = [
    {
        "id": "mh_001",
        "code": "MH-001",
        "name": "云栖花园北井",
        "object_type": "manhole",
        "risk_level": "medium",
        "status": "active",
        "properties": {"manhole_type": "污水井", "catchment_name": "云栖花园片区", "depth_m": 3.2},
        "geom": {"type": "Point", "coordinates": [120.0062, 31.0016]},
    },
    {
        "id": "mh_002",
        "code": "MH-002",
        "name": "云栖花园中井",
        "object_type": "manhole",
        "risk_level": "high",
        "status": "active",
        "properties": {"manhole_type": "监测井", "catchment_name": "云栖花园片区", "depth_m": 3.6},
        "geom": {"type": "Point", "coordinates": [120.0091, 31.0008]},
    },
    {
        "id": "mh_003",
        "code": "MH-003",
        "name": "新港工业园南井",
        "object_type": "manhole",
        "risk_level": "low",
        "status": "active",
        "properties": {"manhole_type": "污水井", "catchment_name": "新港工业园片区", "depth_m": 4.1},
        "geom": {"type": "Point", "coordinates": [120.0148, 30.9986]},
    },
]

INITIAL_PIPES: list[MapObject] = [
    {
        "id": "pipe_001",
        "code": "P-001",
        "name": "云栖花园主干管",
        "object_type": "pipe",
        "risk_level": "medium",
        "status": "active",
        "properties": {"pipe_type": "污水", "diameter_mm": 400, "start_manhole_id": "mh_001", "end_manhole_id": "mh_002"},
        "geom": {"type": "LineString", "coordinates": [[120.0062, 31.0016], [120.0078, 31.0012], [120.0091, 31.0008]]},
    },
    {
        "id": "pipe_002",
        "code": "P-002",
        "name": "新港工业园支管",
        "object_type": "pipe",
        "risk_level": "low",
        "status": "active",
        "properties": {"pipe_type": "污水", "diameter_mm": 500, "start_manhole_id": "mh_002", "end_manhole_id": "mh_003"},
        "geom": {"type": "LineString", "coordinates": [[120.0091, 31.0008], [120.0112, 30.9999], [120.0148, 30.9986]]},
    },
]


def list_static_objects() -> dict[str, list[MapObject]]:
    return STATIC_MAP_OBJECTS


def create_plot_object(
    *,
    code: str,
    name: str,
    risk_level: str,
    plot_type: str,
    water_usage_m3d: float,
    cod_baseline: float,
    coordinates: list[list[float]],
) -> MapObject:
    if any(item["code"] == code for item in STATIC_MAP_OBJECTS["plots"]):
        raise ValueError("地块编号已存在，请更换编号。")

    ring = [[float(lng), float(lat)] for lng, lat in coordinates]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    plot: MapObject = {
        "id": f"plot_{uuid4().hex[:10]}",
        "code": code,
        "name": name,
        "object_type": "plot",
        "risk_level": risk_level,
        "status": "active",
        "properties": {
            "plot_type": plot_type,
            "water_usage_m3d": water_usage_m3d,
            "cod_baseline": cod_baseline,
        },
        "geom": {
            "type": "Polygon",
            "coordinates": [ring],
        },
    }
    STATIC_MAP_OBJECTS["plots"].append(plot)
    return deepcopy(plot)


def update_plot_object(
    plot_id: str,
    *,
    code: str,
    name: str,
    risk_level: str,
    plot_type: str,
    water_usage_m3d: float,
    cod_baseline: float,
    coordinates: list[list[float]] | None = None,
) -> MapObject:
    plot = next((item for item in STATIC_MAP_OBJECTS["plots"] if item["id"] == plot_id), None)
    if not plot:
        raise ValueError("地块不存在。")
    duplicate = next((item for item in STATIC_MAP_OBJECTS["plots"] if item["code"] == code and item["id"] != plot_id), None)
    if duplicate:
        raise ValueError("地块编号已存在，请更换编号。")

    plot["code"] = code
    plot["name"] = name
    plot["risk_level"] = risk_level
    plot["properties"] = {
        "plot_type": plot_type,
        "water_usage_m3d": water_usage_m3d,
        "cod_baseline": cod_baseline,
    }
    if coordinates:
        ring = [[float(lng), float(lat)] for lng, lat in coordinates]
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        plot["geom"] = {
            "type": "Polygon",
            "coordinates": [ring],
        }
    return deepcopy(plot)


def delete_plot_object(plot_id: str) -> None:
    plots = STATIC_MAP_OBJECTS["plots"]
    index = next((idx for idx, item in enumerate(plots) if item["id"] == plot_id), None)
    if index is None:
        raise ValueError("地块不存在。")
    plots.pop(index)


def static_counts() -> dict[str, int]:
    return {key: len(value) for key, value in STATIC_MAP_OBJECTS.items()}


def search_static_objects(keyword: str) -> list[dict[str, Any]]:
    normalized = keyword.strip().lower()
    if not normalized:
        return []

    results: list[dict[str, Any]] = []
    for collection in STATIC_MAP_OBJECTS.values():
        for item in collection:
            text = " ".join([str(item.get("code", "")), str(item.get("name", "")), str(item.get("object_type", ""))]).lower()
            if normalized not in text:
                continue
            results.append(
                {
                    "object_type": item["object_type"],
                    "object_id": item["id"],
                    "title": item["name"],
                    "subtitle": item["code"],
                    "risk_level": item["risk_level"],
                    "geom": item["geom"],
                }
            )
    return results


def line_length_meters(line: list[list[float]]) -> float:
    total = 0.0
    for idx in range(len(line) - 1):
        x1, y1 = line[idx]
        x2, y2 = line[idx + 1]
        total += hypot(x2 - x1, y2 - y1) * 111_000
    return total
