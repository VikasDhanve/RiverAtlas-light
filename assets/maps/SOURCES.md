# 地图数据来源

本目录仅为地图位置参考，全部采用WGS84公开地理数据；不代替项目登记单元和河流管理范围线，不用于面积、长度或界线量算。

河流、县区和水库来自OpenStreetMap，通过Nominatim search polygon_geojson与OSM API way/full取得，2026-11-06准备本地快照。OSM way/relation编号与处理见source-manifest.json，GeoJSON为可编辑的数据副本；src/geography.js是同内容离线脚本封装，避免file协议fetch限制。

© OpenStreetMap contributors，数据许可[ODbL](https://opendatacommons.org/licenses/odbl/1-0/)，[版权与署名](https://www.openstreetmap.org/copyright)。本目录OSM数据及其适配继续按ODbL提供，不将原始业务图片或项目代码视为ODbL数据。

陆地海岸来自[Natural Earth ne_10m_land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_land.geojson)，[公有领域条款](https://www.naturalearthdata.com/about/terms-of-use/)，按大连周边范围裁切/轻微简化，用于区域显示；不是测绘生产底图。

大沙河的OSM主名“沙河”、别名“大沙河”；浮渡河包含与具名主河段共享节点并流入的两个无名上游河段，作为相连水系表达，不据此增加业务登记范围。公开水系可能缺段，不插值补造。原始汇报图image12仍保留对应原件入口供核对。

运行不请求在线瓦片/Nominatim/Overpass，无地图密钥或服务需求。动态河流仅为高亮效果，不模拟真实流量/流速。
