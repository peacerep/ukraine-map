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
  preserveDrawingBuffer: true,
});

// set min zoom to be one less than the zoom calculated to fit the bbox
const minZoom = map.getZoom() - 1;
map.setMinZoom(minZoom);

// add scale bar?

const layers = ["acled", "ucdp", "epr", "powerplants"];

const layersInfo = {
  acled:
    'ACLED (Armed Conflict Location & Event Data Project), downloaded via the <a href="https://acleddata.com/data-export-tool/" target="_blank">ACLED data export tool</a> (filtered for Ukraine only)<br><a href="https://acleddata.com/dashboard/" target="_blank">ACLED Dashboard</a><br><a href="https://acleddata.com/download/2827/" target="_blank">Codebook</a><br>Time period covered by data: 2018-01-01 – present<br>Last updated: 2022-08-07',
  ucdp: 'UCDP Georeferenced Event Dataset (GED) Global version 22.1 via the <a href="https://ucdp.uu.se/apidocs/" target="_blank">UCDP API</a> (filtered for Ukraine only)<br><a href="https://ucdp.uu.se/" target="_blank">UCDP Dashboard</a><br><a href="https://ucdp.uu.se/downloads/ged/ged221.pdf" target="_blank">Codebook</a><br>Time period covered by data: 1989-01-01 – 2021-12- 31',
  epr: '<a href="https://icr.ethz.ch/data/epr/geoepr/" target="_blank">GeoEPR 2021 dataset</a><br><a href="https://icr.ethz.ch/data/epr/geoepr/EPR_2021_Codebook_GeoEPR.pdf" target="_blank">Codebook</a><br>Time period covered by data: 1946 – 2021<br>Release date: 2021-06-08',
  powerplants:
    '<a href="https://datasets.wri.org/dataset/globalpowerplantdatabase" target="_blank">Global Power Plant Database v1.3.0</a><br>Release date: 2021-06-02<br>Additional data on nuclear power plants <a href="https://www.oecd-nea.org/jcms/pl_66130/ukraine-current-status-of-nuclear-power-installations" target="_blank">via OECD</a> (last updated: 2022-08-19)',
  hc: "Data from research by PeaceRep and partners<br>Time period covered by data: 2022-03-05 – 2022-05-04<br>Last updated: 2022-05",
};

// add info boxes
layers.forEach((layer) => {
  // create hidden info box
  d3.select("#" + layer + "-header")
    .append("div")
    .attr("class", "infoBox")
    .attr("id", layer + "-info-box")
    .html(layersInfo[layer])
    .classed("hidden", true)
    .append("span")
    .attr("class", "closebtn")
    .html("&times;")
    .on("click", () =>
      d3.select("#" + layer + "-info-box").classed("hidden", true)
    );
  d3.select("#" + layer + "-info").on("click", () => {
    console.log("!");
    // show popup
    d3.select("#" + layer + "-info-box").classed("hidden", false);
  });
});

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
let legendLabels = {
  acled: (d) => d,
  ucdp: (d) =>
    ["State-Based Conflict", "Non-State Conflict", "One-Sided Violence"][
      +d - 1
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
    .html((d) => legendLabels[dataset](d[0]));
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

Promise.all([
  d3.json("data/1900-01-01-2022-08-07-Ukraine.geojson"), // ACLED
  d3.json("data/ucdp_geojson.json"), // UCDP
  d3.csv("data/global_power_plant_database_ukraine.csv"), // power plant locations
  d3.csv("data/ukraine_power_plants_extra_info.csv"), // power plant additional data
  d3.json("data/GeoEPR-2021-Ukraine.geojson"), // EPR ethnic makeup
]).then(function (data) {
  // modify data
  const acled = data[0];
  acled.features.forEach(function (d) {
    d.properties.timestamp_start = new Date(d.properties.event_date).getTime();
    d.properties.timestamp_end = new Date(d.properties.event_date).getTime();
  });
  const ucdp = data[1];
  ucdp.features.forEach(function (d) {
    d.properties.timestamp_start = new Date(d.properties.date_start).getTime();
    d.properties.timestamp_end = new Date(d.properties.date_end).getTime();
  });
  const powerplants = data[2];
  const powerplants2 = data[3];
  console.log(powerplants);
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

    map.addLayer({
      id: "epr_layer",
      type: "fill",
      source: "epr",
      paint: {
        "fill-color": "#fff",
        "fill-opacity": 0.3,
        "fill-outline-color": "#000",
      },
    });

    map.addLayer({
      id: "acled_layer",
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
      id: "ucdp_layer",
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

    map.loadImage("img/symbol_power.png", (error, img1) => {
      map.loadImage("img/symbol_nuclear.png", (error, img2) => {
        map.addImage("symbol_power", img1);
        map.addImage("symbol_nuclear", img2);

        map.addLayer({
          id: "powerplants_layer",
          type: "symbol",
          source: "powerplants",
          layout: {
            "icon-image": [
              "case",
              ["==", ["get", "primary_fuel"], "Nuclear"],
              "symbol_nuclear",
              "symbol_power",
            ],
            "icon-size": 0.5,
          },
        });
      });
    });

    // wait for data to load, then remove loading message
    waitFor(() =>
      layers.map((l) => map.isSourceLoaded(l)).every((v) => v)
    ).then(() => {
      document.getElementById("loading-message").style.display = "none";
      resetFilters();
    });
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
        map.setLayoutProperty(`${layer}_layer`, "visibility", "visible");
        // update filters for visible layers
        updateFilters(layer);
      } else {
        // hide unchecked layers, no need to update until checked again
        map.setLayoutProperty(`${layer}_layer`, "visibility", "none");
      }
    });
  });
});

function updateFilters(layer) {
  if (layer === "ucdp" || layer === "acled") {
    // set variables
    let varName;
    switch (layer) {
      case "ucdp":
        varName = "type_of_violence";
        break;
      case "acled":
        varName = "event_type";
        break;
      default:
      //
    }

    // get time span
    // using time stamps bc maplibre does not support date objects
    let minDate = getDate("min-date");
    let maxDate = getDate("max-date");
    function getDate(id) {
      let d = document.getElementById(id).value;
      if (d === "") {
        return null;
      } else {
        console.log(id, new Date(d).getTime());
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
    console.log(minDateFilter, maxDateFilter);
    // console.log(minDate, maxDate);

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

    // set category filter accordingly
    let categoryFilter =
      checkedNodes.length === allNodes.length
        ? // remove filter if all are checked
          true
        : // otherwise filter for checked items only
          ["in", ["to-string", ["get", varName]], ["literal", checkedTypes]];

    // combine + set filters
    let filters = ["all", categoryFilter, minDateFilter, maxDateFilter];
    map.setFilter(layer + "_layer", filters);
  } else if (layer === "epr") {
    // no error but no filters either
  } else if (layer === "powerplants") {
    // no time filter
    // check if all or nuclear only
    if (document.getElementById("toggle-nuclear-only").checked) {
      map.setFilter("powerplants_layer", [
        "==",
        ["get", "primary_fuel"],
        "Nuclear",
      ]);
    } else {
      map.setFilter("powerplants_layer", true);
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
  // uncheck the ones that need to be unchecked instead
  document.getElementById("toggle-epr").checked = false;
  document.getElementById("toggle-nuclear-only").checked = false;
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
