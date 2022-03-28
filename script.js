// initialize Leaflet
var map = L.map("map").setView({ lon: 0, lat: 0 }, 2);

// add the OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
}).addTo(map);

// show the scale bar on the lower left corner
L.control.scale({ imperial: true, metric: true }).addTo(map);

d3.json(
  "https://ucdpapi.pcr.uu.se/api/gedevents/21.1?pagesize=1000&StartDate=2020-01-01"
).then(function (data) {
  console.log(data);

  // let ucdp = data.Result;

  // if (data.TotalPages < 20) {
  //   for (let i = 0; i < 3; i++) {
  //     let nextPage =
  //       "https://ucdpapi.pcr.uu.se/api/gedevents/21.1?pagesize=1000&StartDate=2020-01-01&page=" +
  //       i;
  //     d3.json(nextPage).then(function (d) {
  //       console.log(d);
  //     });
  //   }
  //   // doesn't work
  //   console.log(ucdp);
  //   // }
  // } else {
  //   console.log(
  //     "Trying to load too much data at once, page count: ",
  //     data.TotalPages
  //   );
  // }

  // remove loading message when data is loaded
  d3.select("#loading-message").attr("class", "hidden");

  // add a marker w/ popup for each event
  data.Result.forEach(function (event) {
    L.marker({ lon: event.longitude, lat: event.latitude })
      .bindPopup(event.where_description)
      .addTo(map);
  });
});
