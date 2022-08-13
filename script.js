"use strict";

const initBBox = [
  [21.2, 42.9], // [west, south]
  [41.5, 52.75], // [east, north]
];

// map cannot be zoomed/panned outside of these bounds
const maxBounds = [
  [initBBox[0][0] - 15, initBBox[0][1] - 10],
  [initBBox[1][0] + 15, initBBox[1][1] + 10],
];

// initialise map
var map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/bright/style.json?key=29pOogG422DKpW4WspFu",
  bounds: initBBox,
  maxBounds: maxBounds,
});

// set min zoom to be one less than the zoom calculated to fit the bbox
const minZoom = map.getZoom() - 1;
map.setMinZoom(minZoom);

// add scale bar?

const layers = ["acled", "ucdp"];

// color schemes for all datasets
let colorScheme = {
  // ACLED event_type color scheme
  acled: [
    ["Battles", d3.schemeTableau10[0]],
    ["Explosions/Remote violence", d3.schemeTableau10[1]],
    ["Protests", d3.schemeTableau10[2]],
    ["Riots", d3.schemeTableau10[3]],
    ["Strategic developments", d3.schemeTableau10[4]],
    ["Violence against civilians", d3.schemeTableau10[5]],
  ],
  // UCDP type_of_violence color scheme
  ucdp: [
    [1, d3.schemeTableau10[6]],
    [2, d3.schemeTableau10[7]],
    [3, d3.schemeTableau10[8]],
  ],
};

// add legends
layers.forEach(function (dataset) {
  let legend = d3
    .select(`#${dataset}_legend`)
    .selectAll("label")
    .data(colorScheme[dataset])
    .enter()
    .append("label")
    .attr("class", "checkbox-container")
    .html((d) => d[0]);
  legend
    .append("input")
    .attr("type", "checkbox")
    .attr("class", "filterInput")
    .attr("id", (d) => `filter_${dataset}_${d[0]}`)
    .attr("name", (d) => d[0])
    .property("checked", true);
  legend
    .append("span")
    .attr("class", "checkmark")
    .style("background-color", (d) => d[1]);
});

// add zoom to region feature
d3.json("data/ukraine_bounds.json").then(function (data) {
  // get zoom options dropdown and add all admin regions as options
  let zoom_options = d3.select("#selectZoomTo");
  zoom_options.append("optgroup").attr("label", "Administrative Regions");
  zoom_options
    .selectAll(".oblast")
    .data(data)
    .enter()
    .append("option")
    .attr("class", "oblast")
    .attr("value", (d) => d.name_en)
    .html((d) => d.name_en);

  // listen for changes to dropdown + trigger zoom
  zoom_options.on("change", function () {
    // get selected option
    let select = document.getElementById("selectZoomTo");
    let zoomTo = select.options[select.selectedIndex].value;

    // get bounds and zoom map to bounds
    map.easeTo(
      map.cameraForBounds(data.find((d) => d.name_en === zoomTo).bounds)
    );
    // reset dropdown value after 1s
    setTimeout(() => (select.options[0].selected = true), 1000);
  });
});

// when map is ready, add data sources + vis layers
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
        ...colorScheme.acled.flat(),
        d3.schemeTableau10[9], // grey for missing types
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
        ...colorScheme.ucdp.flat(),
        d3.schemeTableau10[9], // grey for missing types
      ],
      "circle-opacity": 0.7,
      "circle-radius": 4,
    },
  });
});

// FILTERS + LAYER TOGGLES

// listen for changes on all filter input elements
// using a class .filterInput here to ensure input elements elsewhere
// on the page do not trigger filter updates (performance)
document.querySelectorAll(".filterInput").forEach((el) => {
  el.addEventListener("change", (e) => {
    // show/hide data layers
    layers.forEach((layer) => {
      if (document.getElementById(`toggle-${layer}`).checked) {
        map.setLayoutProperty(`${layer}_events`, "visibility", "visible");
        // update filters for visible layers
        updateFilters(layer);
      } else {
        // hide unchecked layers, no need to update until checked again
        map.setLayoutProperty(`${layer}_events`, "visibility", "none");
      }
    });
  });
});

function updateFilters(layer) {
  if (layer === "ucdp" || layer === "acled") {
    // set variable
    let varName = layer === "ucdp" ? "type_of_violence" : "event_type";

    // get list of checked layers
    let allNodes = document
      .getElementById(layer + "_legend")
      .querySelectorAll("input[type=checkbox]");
    let checkedNodes = document
      .getElementById(layer + "_legend")
      .querySelectorAll("input[type=checkbox]:checked");
    let checkedTypes = Array.from(checkedNodes).map(
      (d) => d.attributes.name.value
    );

    // set filter accordingly
    if (checkedNodes.length === allNodes.length) {
      // remove filter if all are checked
      map.setFilter(layer + "_events", null);
    } else {
      // otherwise filter for checked items only
      map.setFilter(layer + "_events", [
        "in",
        ["to-string", ["get", varName]],
        ["literal", checkedTypes],
      ]);
    }
  } else {
    console.log("error - filters not implemented for layer: ", layer);
  }
}

function resetFilters() {
  // get list of all filter input checkboxes
  let filters = document.querySelectorAll(".filterInput");
  // check all of them
  // needs updating if we want an initial state other than having everything checked
  filters.forEach((el) => {
    el.checked = true;
  });
  // dispatch a single change event to make the map update
  filters[0].dispatchEvent(new Event("change"));
}

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
