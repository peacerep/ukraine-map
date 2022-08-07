var map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/bright/style.json?key=29pOogG422DKpW4WspFu",
  center: [0, 0],
  zoom: 1,
  bounds: [
    [22, 43],
    [41.5, 53],
  ],
});

// add scale bar?

let fillColor = d3.scaleOrdinal(d3.schemeCategory10);

// // remove loading message when data is loaded
d3.select("#loading-message").attr("class", "hidden");

map.on("load", function () {
  map.addSource("acled", {
    type: "geojson",
    data: "data/1900-01-01-2022-08-07-Ukraine.geojson",
  });

  map.addSource("ucdp", {
    type: "geojson",
    data: "data/ucdp_geojson.json",
  });

  map.addLayer({
    id: "acled_events",
    type: "circle",
    source: "acled",
    paint: {
      "circle-color": "blue",
      // [
      // 'case',
      // mag1,
      // colors[0],
      // mag2,
      // colors[1],
      // mag3,
      // colors[2],
      // mag4,
      // colors[3],
      // colors[4]
      // ],
      "circle-opacity": 0.6,
      "circle-radius": 4,
    },
  });

  map.addLayer({
    id: "ucdp_events",
    type: "circle",
    source: "ucdp",
    paint: {
      "circle-color": "red",
      "circle-opacity": 0.6,
      "circle-radius": 4,
    },
  });
});

// checkboxes to toggle layers on and off
document.getElementById("toggleACLED").addEventListener("change", (event) => {
  if (event.currentTarget.checked) {
    map.setLayoutProperty("acled_events", "visibility", "visible");
  } else {
    map.setLayoutProperty("acled_events", "visibility", "none");
  }
});
document.getElementById("toggleUCDP").addEventListener("change", (event) => {
  if (event.currentTarget.checked) {
    map.setLayoutProperty("ucdp_events", "visibility", "visible");
  } else {
    map.setLayoutProperty("ucdp_events", "visibility", "none");
  }
});
