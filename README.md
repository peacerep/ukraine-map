# Data Sources

-   ACLED data: via the [ACLED Data Export Tool](https://acleddata.com/data-export-tool/), with Country=Ukraine, no other filters.
    -   Converted to GeoJSON using [this online converter](https://www.convertcsv.com/csv-to-geojson.htm).
-   UCDP data: UCDP Georeferenced Event Dataset (GED) Global version 22.1 via the [UCDP API](https://ucdp.uu.se/apidocs/), for Ukraine only: `https://ucdpapi.pcr.uu.se/api/gedevents/22.1?pagesize=1000&country_id=369`
    -   Converted to GeoJSON with a small JS script hosted on Observable (not public).
-   Ukraine Oblast boundaries via [Github](https://github.com/justinelliotmeyers/Ukraine_2020/blob/master/oblast.geojson), used for zoom to region feature. Oblast names translated to English using Google Translate and [Wikipedia](https://en.wikipedia.org/wiki/Oblasts_of_Ukraine#Renamed_oblasts). Polygon boundaries transformed to bounding boxes by first [rewinding the geojson file](https://observablehq.com/@bumbeishvili/rewind-geojson), then using `d3.geoBounds` to obtain bounding boxes for each region. Result is in `data/ukraine_bounds.json`.

# Libraries

Built using the [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) library and [Maptiler](https://www.maptiler.com/) vector tiles. Also using [D3](https://d3js.org/).

# Links

-   [MapLibre GL JS API Reference](https://maplibre.org/maplibre-gl-js-docs/api/)
-   [Using MapLibre GL JS with vector tiles from MapTiler Cloud](https://cloud.maptiler.com/maps/bright/maplibre-gl-js)
