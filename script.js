"use strict";

const initBBox = [
  [22, 43],
  [41.5, 53],
];

var map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/bright/style.json?key=29pOogG422DKpW4WspFu",
  // center: [0, 0],
  // zoom: 1,
  bounds: initBBox,
});

// add scale bar?

// ACLED event_type color scheme
let colorSchemeACLED = [
  ["Battles", d3.schemeTableau10[0]],
  ["Explosions/Remote violence", d3.schemeTableau10[1]],
  ["Protests", d3.schemeTableau10[2]],
  ["Riots", d3.schemeTableau10[3]],
  ["Strategic developments", d3.schemeTableau10[4]],
  ["Violence against civilians", d3.schemeTableau10[5]],
];

// UCDP type_of_violence color scheme
let colorSchemeUCDP = [
  [1, d3.schemeTableau10[6]],
  [2, d3.schemeTableau10[7]],
  [3, d3.schemeTableau10[8]],
];

// add legends
let acledLegend = d3
  .select("#acled_legend")
  .selectAll("div")
  .data(colorSchemeACLED)
  .enter()
  .append("div");
acledLegend
  .append("div")
  .attr("class", "legendCircle")
  .style("background-color", (d) => d[1]);
acledLegend
  .append("div")
  .attr("class", "legendLabel")
  .html((d) => d[0]);

let ucdpLegend = d3
  .select("#ucdp_legend")
  .selectAll("div")
  .data(colorSchemeUCDP)
  .enter()
  .append("div");
ucdpLegend
  .append("div")
  .attr("class", "legendCircle")
  .style("background-color", (d) => d[1]);
ucdpLegend
  .append("div")
  .attr("class", "legendLabel")
  .html((d) => "Type " + d[0]);

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
      "circle-color": [
        "match",
        ["get", "event_type"],
        ...colorSchemeACLED.flat(),
        d3.schemeTableau10[9],
      ],
      "circle-opacity": 0.7,
      "circle-radius": 4,
    },
  });

  map.addLayer({
    id: "ucdp_events",
    type: "circle",
    source: "ucdp",
    paint: {
      "circle-color": [
        "match",
        ["get", "type_of_violence"],
        ...colorSchemeUCDP.flat(),
        d3.schemeTableau10[9],
      ],
      "circle-opacity": 0.7,
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

// zoom buttons
document.getElementById("zoomIn").addEventListener("click", (e) => {
  map.zoomIn();
});
document.getElementById("zoomOut").addEventListener("click", (e) => {
  map.zoomOut();
});
document.getElementById("zoomReset").addEventListener("click", (e) => {
  map.easeTo(map.cameraForBounds(initBBox));
});
