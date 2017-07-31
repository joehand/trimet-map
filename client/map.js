/* global mapboxgl */

var wss = require('websocket-stream')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var pump = require('pump')
var ndjson = require('ndjson')

var key = '5c9100073ba750b66b124dcd1854c039056a6b8cea34d115aa21c0750154d46d'
mapboxgl.accessToken = 'pk.eyJ1Ijoiam9lYWhhbmQiLCJhIjoiaDd1MEJZQSJ9.fl3WTCt8MGNOSCGR_qqz7A'

var initialFetchDone = false
var mapLoaded = false
var archive = hyperdrive(ram, key, {sparse: true})
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/joeahand/cj5rh94o22rqz2rqi7i2i5tkq',
    center: [-122.6782433, 45.5252814],
    zoom: 12
})
var geojson = {
  type: 'FeatureCollection',
  features: []
}
var pendingData = []

replicate()

map.on('load', function() {
  mapLoaded = true
  map.addSource('vehicles', { type: 'geojson', data: geojson })
  if (!initialFetchDone) fetchData()

  map.addLayer({
    "id": "bus",
    "type": "symbol",
    "source": "vehicles",
    "layout": {
        "icon-image": "bus-15",
        "icon-allow-overlap": true
    },
    "filter": ["==" , "type" , "bus"]
  })
  map.addLayer({
    "id": "rail",
    "type": "symbol",
    "source": "vehicles",
    "layout": {
        "icon-image": "rail-15",
        "icon-allow-overlap": true
    },
    "filter": ["==" , "type" , "rail"]
  })
})

function fetchData () {
  console.log(archive)
  archive.createReadStream('/vehicles.json')
    .pipe(ndjson.parse())
    .on('data', function (data) {
      console.log(data)
      geojson.features.push(data)
      // geojson.features.push(point2GeoJSON(data))
      map.getSource('vehicles').setData(geojson)
    })
    .on('end', function () {
      console.log('initial fetch done')
      initialFetchDone = true
      archive.once('update', updateData)
    })
}

// function animate() {
//   updateData(function () {
//     console.log('animate')
//     geojson.features = pendingData.pop()
//     map.getSource('vehicles').setData(geojson)
//     if (pendingData.length) return requestAnimationFrame(animate)
//     archive.once('update', function () {
//       requestAnimationFrame(animate)
//     })
//   })
// }

function updateData (cb) {
  console.log('updating data')
  var features = []
  archive.createReadStream('/vehicles.json')
    .pipe(ndjson.parse())
    .on('data', function (data) {
      features.push(data)
      // features.push(point2GeoJSON(data)) // TODO: update by ID & setData here
    })
    .on('end', function () {
      console.log('update done')

      geojson.features = features
      map.getSource('vehicles').setData(geojson)
      archive.once('update', updateData)

      // pendingData.push(features)
      // if (cb) return cb()
    })
}

function point2GeoJSON (data) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [data.longitude, data.latitude]
    },
    properties: data
  }
}

function replicate () {
  var wsProtocol =  (window.location.protocol === 'https:') ? 'wss://' : 'ws://'
  var ws = wss(wsProtocol + location.host) // ???
  ws.on('connect', function () {
    console.log('websockets connected')
    if (!initialFetchDone && mapLoaded) fetchData()
  })
  pump(ws, archive.replicate({live: true}), ws, function (err) {
    // console.error('error', err)
    setTimeout(replicate, 500) // again if it closes?
  })
}
