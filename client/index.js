var html = require('choo/html')
var css = require('sheetify')
var log = require('choo-log')
var choo = require('choo')
var wss = require('websocket-stream')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var pump = require('pump')
var ndjson = require('ndjson')
var MapEl = require('./map.js')

var config = require('../config') // TODO: real config

css('mapbox-gl')

var app = choo()
var archive = hyperdrive(ram, config.archive, {sparse: true})
var map = new MapEl()

app.use(log())
app.use(store)
app.route('/', mainView)
app.mount('body')

function mainView (state, emit) {
  return html`
    <body>
      <header>
        <h1>${state.title}</h1>
      </header>
      <main>
        ${map.render(state.geojson)}
      </main>
    </body>
  `
}

function store (state, emitter) {
  state.geojson = {
    type: 'FeatureCollection',
    features: []
  }
  state.title = 'PDX Bus Delay'

  emitter.once('DOMContentLoaded', function () {
    emitter.on('update-data', updateData)
    fetchData()
  })

  replicate()

  function updateData (newFeatures) {
    console.log('updating data')
    state.geojson.features = newFeatures
    emitter.emit('render')
  }

  function fetchData () {
    archive.createReadStream('/vehicles.json')
      .pipe(ndjson.parse())
      .on('data', function (data) {
        state.geojson.features.push(data)
      })
      .on('end', function () {
        console.log('initial fetch done')
        emitter.emit('render')
        archive.once('update', updateData)
      })

    function updateData (cb) {
      var features = []
      archive.createReadStream('/vehicles.json')
        .pipe(ndjson.parse())
        .on('data', function (data) {
          features.push(data)
        })
        .on('end', function () {
          emitter.emit('update-data', features)
          archive.once('update', updateData)
        })
    }
  }

  function replicate () {
    console.log('replicate')
    var wsProtocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://'
    var wsUrl = config.wsUrl || wsProtocol + location.host // ???
    var ws = wss(wsUrl)
    ws.on('connect', function () {
      console.log('websockets connected')
      // if we got disconnected during initial fetch, try again
      // if (!initialFetchDone && mapLoaded) fetchData()
    })
    pump(ws, archive.replicate({live: true}), ws, function (err) {
      setTimeout(replicate, 500)
    })
  }
}
