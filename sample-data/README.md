# Sample Data

当前仓库提供可直接用于 `导入管理` 页测试的示例数据：

- `sample-data/excel/manholes-demo.xlsx`
- `sample-data/excel/pipes-demo.xlsx`
- `sample-data/geojson/manholes-demo.geojson`
- `sample-data/geojson/pipes-demo.geojson`

推荐测试顺序：

1. 打开 `导入管理`
2. 选择对象类型
3. 上传对应文件
4. 如果是 Excel，按下列字段映射：
   - 检查井：
     - `code -> code`
     - `name -> name`
     - `risk_level -> risk_level`
     - `manhole_type -> manhole_type`
     - `catchment_name -> catchment_name`
     - `depth_m -> depth_m`
     - `lng -> lng`
     - `lat -> lat`
   - 管道：
     - `code -> code`
     - `name -> name`
     - `risk_level -> risk_level`
     - `pipe_type -> pipe_type`
     - `diameter_mm -> diameter_mm`
     - `start_manhole_id -> start_manhole_id`
     - `end_manhole_id -> end_manhole_id`
5. 点击 `预览`
6. 点击 `提交入库`

GeoJSON 说明：

- 检查井使用 `Point`
- 管道使用 `LineString`
- 属性字段已尽量按当前系统字段命名，可直接预览和导入

当前示例编号段已统一改为：

- 检查井：`MH-260311-901` ~ `MH-260311-903`
- 管道：`P-260311-901` ~ `P-260311-902`

如果你已经导入过旧示例，不要复用旧批次，直接新建一个新批次再导。
