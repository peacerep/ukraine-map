// initialize Leaflet
var map = L.map("map")
  // zoom to Ukraine
  .fitBounds([
    [52.487125, 21.641782],
    [43.814742, 39.073691],
  ]);

// add the OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
}).addTo(map);

// show scale bar on the lower left corner
L.control.scale({ imperial: true, metric: true }).addTo(map);

// datasets
let acled = d3.csv("data/1900-01-01-2022-08-07-Ukraine.csv");
let ucdp = d3.json("data/ucdp_ged_via_api.json");
let layer_ucdp, layer_acled;

// load data and add to map
Promise.all([acled, ucdp]).then(function (data) {
  console.log(data);

  let acled = data[0];
  let ucdp = data[1].Result;
  // let ucdp = data[0].Result;

  // // remove loading message when data is loaded
  d3.select("#loading-message").attr("class", "hidden");

  // add a marker w/ popup for each event
  layer_ucdp = L.layerGroup(
    ucdp.map(function (event) {
      return L.circleMarker(
        { lon: event.longitude, lat: event.latitude },
        { fillColor: "red", fillOpacity: 1, stroke: false, radius: 4 }
      ).bindPopup(event.where_description);
    })
  );
  layer_ucdp.addTo(map);

  layer_acled = L.layerGroup(
    acled.map(function (event) {
      return L.circleMarker(
        { lon: event.longitude, lat: event.latitude },
        { fillOpacity: 1, stroke: false, radius: 4 }
      ).bindPopup(event.notes);
    })
  );
  layer_acled.addTo(map);

  // end promise
});

// checkboxes to toggle layers on and off
document.getElementById("toggleACLED").addEventListener("change", (event) => {
  if (event.currentTarget.checked) {
    layer_acled.addTo(map);
  } else {
    layer_acled.remove();
  }
});
document.getElementById("toggleUCDP").addEventListener("change", (event) => {
  if (event.currentTarget.checked) {
    layer_ucdp.addTo(map);
  } else {
    layer_ucdp.remove();
  }
});
