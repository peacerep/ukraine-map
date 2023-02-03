"use strict";

//uncheck all layers to overwrite any that might still be checked in cache
document.querySelectorAll(".layerToggle").forEach((el) => {
  el.checked = false;
});

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
  preserveDrawingBuffer: true,
});

// all data layers will be placed under this and all following layers
// makes city/country labels show up above data points
const layerUnder = "place-other";

// set min zoom to be one less than the zoom calculated to fit the bbox
const minZoom = map.getZoom() - 1;
map.setMinZoom(minZoom);

const layers = ["acled", "ucdp", "epr", "powerplants", "hc"];

// check for URL parameters
const url = new URL(window.location.href);
const layerSettings =
  url.searchParams.has("layers") && url.searchParams.get("layers") == "hc"
    ? // custom: hc only
      { acled: false, ucdp: false, epr: false, powerplants: false, hc: true }
    : // default settings
      // sub-options for each layer are always all checked by default
      { acled: true, ucdp: true, epr: false, powerplants: true, hc: false };

// check boxes accordingly once layers are loaded (see end of map initialization function below)

// make info boxes togglable
layers.forEach((layer) => {
  d3.select("#" + layer + "-info-box")
    .classed("hidden", true)
    .append("span")
    .attr("class", "closebtn")
    .html("&times;")
    .on("click", () =>
      d3.select("#" + layer + "-info-box").classed("hidden", true)
    );
  d3.select("#" + layer + "-info").on("click", () => {
    // show popup
    d3.select("#" + layer + "-info-box").classed("hidden", false);
  });
});

// auto-generate options boxes for three of the datasets
let eprColor = "#c48e29";
// color schemes
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
    ["1", d3.schemeTableau10[6]],
    ["2", d3.schemeTableau10[7]],
    ["3", d3.schemeTableau10[8]],
  ],
  // humanitarian corridors status_result color scheme
  hc: [
    ["successful", "#0e73bd"],
    ["disputed", "#860ebd"],
    ["unsuccessful/disrupted", "#a40909"],
    ["proposed route/outcome unknown", "#888"],
  ],
  // epr group color scheme -- could add different colors for each here
  epr: [
    ["Ukrainians", eprColor],
    ["Russians", eprColor],
    ["Rusyns", eprColor],
    ["Romanians/Moldovans", eprColor],
    ["Hungarians", eprColor],
    ["Crimean Tatars", eprColor], // these are not in the 2015-21 data
  ],
};
let optionLabels = {
  acled: (d) => d,
  ucdp: (d) =>
    ["State-Based Conflict", "Non-State Conflict", "One-Sided Violence"][
      +d - 1
    ],
  hc: (d) => d,
  epr: (d) => d,
};
// add option menus
Object.keys(colorScheme).forEach(function (layer) {
  let options = d3
    .select(`#${layer}-options`)
    .append("div")
    .selectAll("label")
    .data(colorScheme[layer])
    .enter()
    .append("label")
    .attr("class", "checkbox-container")
    .html((d) => optionLabels[layer](d[0]));
  options
    .append("input")
    .attr("type", "checkbox")
    .attr("class", "filterInput")
    .attr("id", (d) => `filter_${layer}_${d[0]}`)
    .attr("name", (d) => d[0])
    .property("checked", true);
  options
    .append("span")
    .attr("class", "checkmark")
    .style("background-color", (d) => d[1]);
});
// ensure nuclear-only toggle is checked (added in html)
document.getElementById("toggle-nuclear-only").checked = true;

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

Promise.all([
  d3.csv("data/ACLED-Ukraine.csv"), // ACLED
  d3.csv("data/UCDP-Ukraine.csv"), // UCDP
  d3.csv("data/global_power_plant_database_ukraine.csv"), // power plant locations
  d3.csv("data/ukraine_power_plants_extra_info.csv"), // power plant additional data
  d3.json("data/GeoEPR-2021-Ukraine.geojson"), // EPR ethnic makeup
  d3.csv("data/Humanitarian Corridors Ukraine - HC_geocoded.csv"), // humanitarian corridors
]).then(function (data) {
  // modify data

  // turn acled csv into geojson
  const acled = {
    type: "FeatureCollection",
    features: data[0].map((e) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.longitude, e.latitude],
        },
        properties: e,
      };
    }),
  };
  acled.features.forEach(function (d) {
    d.properties.timestamp_start = new Date(d.properties.event_date).getTime();
    d.properties.timestamp_end = new Date(d.properties.event_date).getTime();
  });

  // turn ucdp csv into geojson
  const ucdp = {
    type: "FeatureCollection",
    features: data[1].map(function (e) {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.longitude, e.latitude],
        },
        properties: e,
      };
    }),
  };
  ucdp.features.forEach(function (d) {
    d.properties.timestamp_start = new Date(d.properties.date_start).getTime();
    d.properties.timestamp_end = new Date(d.properties.date_end).getTime();
  });

  const powerplants = data[2];
  const powerplants2 = data[3];
  // find keys that are used in the second dataset but not the first one
  let addKeys = Object.keys(powerplants2[0]).filter(
    (k) => !Object.keys(powerplants[0]).includes(k)
  );

  powerplants2.forEach((el) => {
    // add additional data from the second dataset to the first dataset
    if (el.dataset === "Global Power Plant Database") {
      // find entry in powerplants db and add info
      let index = powerplants.findIndex((d) => d.gppd_idnr === el.gppd_idnr);
      addKeys.forEach((k) => {
        powerplants[index][k] = el[k];
      });
    } else {
      // if id cannot be found (should only be for Chernobyl), add a new element
      powerplants.push(el);
    }
  });
  const powerplants_geojson = {
    type: "FeatureCollection",
    features: powerplants.map(function (el) {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [+el.longitude, +el.latitude],
        },
        properties: el,
      };
    }),
  };

  const epr = data[4];

  const hc = data[5];
  const hc_geojson = {
    type: "FeatureCollection",
    features: hc.map(function (el) {
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: arcPoints(
            [+el.from_longitude, +el.from_latitude],
            [+el.to_longitude, +el.to_latitude],
            0.2,
            20
          ),
        },
        properties: el,
      };
    }),
  };
  hc_geojson.features.forEach(function (d) {
    d.properties.timestamp_start = new Date(d.properties.date).getTime();
    d.properties.timestamp_end = new Date(d.properties.date).getTime();
  });

  // when map is ready, add data sources + vis layers
  map.on("load", function () {
    map.addSource("acled", {
      type: "geojson",
      data: acled,
    });

    map.addSource("ucdp", {
      type: "geojson",
      data: ucdp,
    });

    map.addSource("epr", {
      type: "geojson",
      data: epr,
    });

    map.addSource("powerplants", {
      type: "geojson",
      data: powerplants_geojson,
    });

    map.addSource("hc", {
      type: "geojson",
      data: hc_geojson,
    });

    var popup = new maplibregl.Popup();

    map.addLayer(
      {
        id: "epr-layer",
        type: "fill",
        source: "epr",
        paint: {
          "fill-color": [
            "match",
            ["get", "group"],
            ...colorScheme.epr.flat(),
            eprColor, // for missing types
          ],
          "fill-opacity": 0.25,
        },
        layout: {
          visibility: "none",
        },
      },
      layerUnder
    );
    map.addLayer(
      {
        id: "epr-outline-layer",
        type: "line",
        source: "epr",
        paint: {
          "line-color": [
            "match",
            ["get", "group"],
            ...colorScheme.epr.flat(),
            eprColor, // for missing types
          ],
          "line-width": 1,
        },
        layout: {
          visibility: "none",
        },
      },
      layerUnder
    );
    map.on("click", "epr-layer", (e) => {
      var coordinates = e.lngLat;
      var tooltip = "Ethnic group: " + e.features[0].properties.group;
      popup.setLngLat(coordinates).setHTML(tooltip).addTo(map);
    });

    map.addLayer(
      {
        id: "acled-layer",
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
        layout: {
          visibility: "none",
        },
      },
      layerUnder
    );

    map.addLayer(
      {
        id: "ucdp-layer",
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
        layout: {
          visibility: "none",
        },
      },
      layerUnder
    );

    map.loadImage("img/symbol_power.png", (error, img1) => {
      map.loadImage("img/symbol_nuclear.png", (error, img2) => {
        map.loadImage("img/symbol_nuclear_decom.png", (error, img3) => {
          map.addImage("symbol_power", img1);
          map.addImage("symbol_nuclear", img2);
          map.addImage("symbol_nuclear_decom", img3);

          map.addLayer(
            {
              id: "powerplants-layer",
              type: "symbol",
              source: "powerplants",
              layout: {
                visibility: "none",
                "icon-allow-overlap": true,
                "icon-image": [
                  "case",
                  ["==", ["get", "primary_fuel"], "Nuclear"],
                  "symbol_nuclear",
                  [
                    "case",
                    [
                      "==",
                      ["get", "primary_fuel"],
                      "Nuclear – undergoing decommissioning",
                    ],
                    "symbol_nuclear_decom",
                    "symbol_power",
                  ],
                ],
                "icon-size": 0.5,
                "symbol-sort-key": [
                  "case",
                  [
                    "any",
                    ["==", ["get", "primary_fuel"], "Nuclear"],
                    [
                      "==",
                      ["get", "primary_fuel"],
                      "Nuclear – undergoing decommissioning",
                    ],
                  ],
                  1,
                  0,
                ],
              },
            },
            layerUnder
          );
        });
      });
    });

    map.on("click", "powerplants-layer", (e) => {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var tooltip =
        "<b>" +
        e.features[0].properties.name +
        " (" +
        e.features[0].properties.primary_fuel +
        ")</b><br>" +
        e.features[0].properties.tooltip_info +
        "<br><b>Source:</b> " +
        e.features[0].properties.additional_info_source_with_html;
      popup.setLngLat(coordinates).setHTML(tooltip).addTo(map);
    });
    // change cursor to pointer when on the powerplants layer
    map.on("mouseenter", "powerplants-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "powerplants-layer", () => {
      map.getCanvas().style.cursor = "";
    });

    map.addLayer(
      {
        id: "hc-layer",
        type: "line",
        source: "hc",
        layout: {
          visibility: "none",
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "status_result"],
            ...colorScheme.hc.flat(),
            d3.schemeTableau10[9], // grey for missing types
          ],
          "line-width": 5,
          "line-opacity": 0.6,
        },
      },
      layerUnder
    );
    map.on("click", "hc-layer", (e) => {
      var coordinates = e.lngLat;
      var tooltip =
        "Humanitarian Corridor:<br>Date: " +
        e.features[0].properties.date +
        "<br>From " +
        e.features[0].properties.from_name +
        " (" +
        e.features[0].properties.from_country_code +
        ") to " +
        e.features[0].properties.to_name +
        " (" +
        e.features[0].properties.to_country_code +
        ")<br>Status: " +
        e.features[0].properties.status_result;
      popup.setLngLat(coordinates).setHTML(tooltip).addTo(map);
    });
    // change cursor to pointer when on the powerplants layer
    map.on("mouseenter", "hc-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "hc-layer", () => {
      map.getCanvas().style.cursor = "";
    });

    map.loadImage("img/arrow2.png", function (err, image) {
      if (err) {
        console.error("err image", err);
        return;
      }
      map.addImage("arrow", image, { sdf: "true" });
      map.addLayer(
        {
          id: "hc-arrow-layer",
          type: "symbol",
          source: "hc",
          layout: {
            visibility: "none",
            "symbol-placement": "line",
            "symbol-spacing": 1,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-image": "arrow",
            "icon-size": 5 / 24, // icon size is 24, scale to line width
          },
          paint: {
            "icon-color": [
              "match",
              ["get", "status_result"],
              ...colorScheme.hc.flat(),
              d3.schemeTableau10[9], // grey for missing types
            ],
          },
        },
        layerUnder
      );
    });

    // wait for data to load, then remove loading messages
    layers.map((l) =>
      waitFor(() => map.isSourceLoaded(l)).then(() => {
        document.getElementById(l + "-header").classList.remove("loading");
        // check/uncheck based on layer settings
        let c = document.getElementById("toggle-" + l);
        c.checked = layerSettings[l];
        // dispatch change event so the map updates
        c.dispatchEvent(new Event("change"));
      })
    );
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
        map.setLayoutProperty(`${layer}-layer`, "visibility", "visible");
        if (layer === "hc") {
          map.setLayoutProperty(`hc-arrow-layer`, "visibility", "visible");
        } else if (layer === "epr") {
          map.setLayoutProperty(`epr-outline-layer`, "visibility", "visible");
        }
        // update filters for visible layers
        updateFilters(layer);
      } else {
        // hide unchecked layers, no need to update until checked again
        map.setLayoutProperty(`${layer}-layer`, "visibility", "none");
        if (layer === "hc") {
          map.setLayoutProperty(`hc-arrow-layer`, "visibility", "none");
        } else if (layer === "epr") {
          map.setLayoutProperty(`epr-outline-layer`, "visibility", "none");
        }
      }
    });
  });
});

function updateFilters(layer) {
  let c, t, filters;
  switch (layer) {
    case "ucdp":
      c = getCategoryFilter("ucdp", "type_of_violence");
      t = getDateFilter();
      filters = ["all", c, t.min, t.max];
      map.setFilter("ucdp-layer", filters);
      break;
    case "acled":
      c = getCategoryFilter("acled", "event_type");
      t = getDateFilter();
      filters = ["all", c, t.min, t.max];
      map.setFilter("acled-layer", filters);
      break;
    case "hc":
      c = getCategoryFilter("hc", "status_result");
      t = getDateFilter();
      filters = ["all", c, t.min, t.max];
      map.setFilter("hc-layer", filters);
      map.setFilter("hc-arrow-layer", filters);
      break;
    case "epr":
      // t = [
      //   "==",
      //   ["get", "from"],
      //   document.getElementById("epr-time1").checked ? 1991 : 2015,
      // ];
      c = getCategoryFilter("epr", "group");
      map.setFilter("epr-layer", c);
      map.setFilter("epr-outline-layer", c);
      // combine + set filters
      // map.setFilter("epr-layer", ["all", c, t]);
      // map.setFilter("epr-outline-layer", ["all", c, t]);
      break;
    case "powerplants":
      // no time filter
      // check if all or nuclear only
      if (document.getElementById("toggle-nuclear-only").checked) {
        map.setFilter("powerplants-layer", [
          "any",
          ["==", ["get", "primary_fuel"], "Nuclear"],
          [
            "==",
            ["get", "primary_fuel"],
            "Nuclear – undergoing decommissioning",
          ],
        ]);
      } else {
        map.setFilter("powerplants-layer", true);
      }
      break;
    default:
      console.log("error - filters not implemented for layer: ", layer);
  }

  function getDateFilter() {
    // get time span
    // using time stamps bc maplibre does not support date objects
    let minDate = getDate("min-date");
    let maxDate = getDate("max-date");
    function getDate(id) {
      let d = document.getElementById(id).value;
      if (d === "") {
        return null;
      } else {
        return new Date(d).getTime();
      }
    }
    let minDateFilter =
      minDate === null
        ? true
        : [">=", ["number", ["get", "timestamp_end"]], minDate];
    let maxDateFilter =
      maxDate === null
        ? true
        : ["<=", ["number", ["get", "timestamp_start"]], maxDate];
    return { min: minDateFilter, max: maxDateFilter };
  }

  function getCategoryFilter(layer, varName) {
    // get list of checked layers
    let allNodes = document
      .getElementById(layer + "-options")
      .querySelectorAll("input[type=checkbox]");
    let checkedNodes = document
      .getElementById(layer + "-options")
      .querySelectorAll("input[type=checkbox]:checked");
    let checkedTypes = Array.from(checkedNodes).map(
      (d) => d.attributes.name.value
    );
    // set category filter accordingly
    let categoryFilter =
      checkedNodes.length === allNodes.length
        ? // remove filter if all are checked
          true
        : // otherwise filter for checked items only
          ["in", ["to-string", ["get", varName]], ["literal", checkedTypes]];
    return categoryFilter;
  }
}

function resetFilters() {
  // set layer filters according to settings
  layers.forEach((l) => {
    document.getElementById("toggle-" + l).checked = layerSettings[l];
  });

  // check all sub-options for all layers
  let opt = document.querySelectorAll(".layerOptions input");
  opt.forEach((el) => {
    el.checked = true;
  });

  // reset date inputs
  document.getElementById("min-date").value = "";
  document.getElementById("max-date").value = "";
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

function captureScreenshot() {
  // download image
  // https://stackoverflow.com/questions/3906142/how-to-save-a-png-from-javascript-variable
  var download = document.createElement("a");
  download.href = map.getCanvas().toDataURL();
  download.download = "screenshot.png";
  download.click();
  // to open image in new tab (requires popup permission) instead:
  // window.open(map.getCanvas().toDataURL());
}

// https://stackoverflow.com/questions/7193238/wait-until-a-condition-is-true
function waitFor(conditionFunction) {
  const poll = (resolve) => {
    if (conditionFunction()) resolve();
    else setTimeout((_) => poll(resolve), 100);
  };
  return new Promise(poll);
}
