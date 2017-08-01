/* global mapboxgl */

var wss = require('websocket-stream')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var pump = require('pump')
var ndjson = require('ndjson')
var mapboxgl = require('mapbox-gl')

var key = '5c9100073ba750b66b124dcd1854c039056a6b8cea34d115aa21c0750154d46d'
mapboxgl.accessToken = 'pk.eyJ1Ijoiam9lYWhhbmQiLCJhIjoiaDd1MEJZQSJ9.fl3WTCt8MGNOSCGR_qqz7A'

var initialFetchDone = false
var fetchingData = false
var mapLoaded = false
var archive = hyperdrive(ram, key, {sparse: true})
var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/joeahand/cj5rh94o22rqz2rqi7i2i5tkq',
  center: [-122.6782433, 45.5252814],
  zoom: 12,
  maxBounds: [
      // Portland area bounds
      [-123.1779407, 45.219892], // Southwest coordinates
      [-122.2815557, 45.699901]  // Northeast coordinates
  ]
})
var geojson = {
  type: 'FeatureCollection',
  features: []
}

replicate()

map.on('load', function () {
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

  // Not many buses report this (still marked as experiemental)
  // (Only for buses)
  map.addLayer({
    'id': 'inCongestion',
    'type': 'circle',
    'source': 'vehicles',
    'paint': {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': 10,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#f00'
    },
    'filter': ['==', 'inCongestion', true]
  })

  var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  })

  map.on('mouseenter', 'bus', function (e) {
    map.getCanvas().style.cursor = 'pointer'
    popup.setLngLat(e.features[0].geometry.coordinates)
      .setHTML(e.features[0].properties.sign)
      .addTo(map)
  })

  map.on('mouseleave', 'bus', function () {
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
})

function fetchData () {
  if (fetchingData) return // todo: clean up stuff so we don't have to do this
  var delayCount = 0
  fetchingData = true
  archive.createReadStream('/vehicles.json')
    .pipe(ndjson.parse())
    .on('data', function (data) {
      // console.log(data)
      if (data.properties.delay < 0) delayCount++
      geojson.features.push(data)
      map.getSource('vehicles').setData(geojson)
    })
    .on('end', function () {
      console.log('initial fetch done')
      initialFetchDone = true
      fetchingData = false
      archive.once('update', updateData)
      console.log(delayCount)
    })
}

function updateData (cb) {
  var features = []
  archive.createReadStream('/vehicles.json')
    .pipe(ndjson.parse())
    .on('data', function (data) {
      features.push(data)
    })
    .on('end', function () {
      console.log('update done')
      geojson.features = features
      map.getSource('vehicles').setData(geojson)
      archive.once('update', updateData)
    })
}

function replicate () {
  var wsProtocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://'
  var ws = wss(wsProtocol + location.host) // ???
  ws.on('connect', function () {
    console.log('websockets connected')
    // if we got disconnected during initial fetch, try again
    if (!initialFetchDone && mapLoaded) fetchData()
  })
  pump(ws, archive.replicate({live: true}), ws, function (err) {
    setTimeout(replicate, 500)
  })
}
