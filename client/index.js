var html = require('choo/html')
var css = require('sheetify')
var log = require('choo-log')
var choo = require('choo')
var wss = require('websocket-stream')
var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var pump = require('pump')
var ndjson = require('ndjson')
var moment = require('moment')
var MapEl = require('./map.js')

var config = require('../config') // TODO: real config

css('mapbox-gl')
css('tachyons')

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
      <main class="cf vh-100 sans-serif">
        <header class="fn fl-ns w-25-ns pr4-ns">
          <article class="pa1 pa3-ns" data-name="slab-stat-small">
            <h3 class="f3 ttu tracked">${state.title}</h3>
            ${stats()}
          </article>
        </header>
        <div class="fn fl-ns w-75-ns vh-100">
            ${map.render(state.geojson)}
        </div>
      </main>
    </body>
  `

  function stats () {
    if (!state.stats || !state.stats.busCount) return 'Loading...'
    return html`
      <div>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Total Vehicles</dd>
          <dd class="f3 fw6 ml0">${state.stats.busCount}</dd>
        </dl>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Total Delay</dd>
          <dd class="f3 fw6 ml0">${delay(state.stats.totalDelay)}</dd>
        </dl>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Average Delay</dd>
          <dd class="f3 fw6 ml0">${delay(state.stats.avgDelay)}</dd>
        </dl>
      </div>
    `

    function delay (val) {
      if (val > 0) return moment.duration(val, 'seconds').humanize()
      var absVal = val * -1

      // 120 minutes
      if (absVal > 120 * 60) return `${moment.duration(absVal, 'seconds').asHours().toFixed(2)} hours`
      return moment.duration(absVal, 'seconds').humanize()
    }
  }
}

function store (state, emitter) {
  const defaultStats = {
    totalDelay: 0,
    avgDelay: 0,
    busCount: 0,
    // loadPerCount: [0, 0, 0] // 0%, 70%, 90% are only values reported
  }
  state.stats = {}
  state.geojson = {
    type: 'FeatureCollection',
    features: []
  }
  state.title = 'PDX Bus Delay'

  emitter.once('DOMContentLoaded', function () {
    emitter.on('update-data', updateData)
    emitter.on('update-stats', updateStats)
    fetchData()
  })

  replicate()

  function updateData (newFeatures) {
    state.geojson.features = newFeatures
    emitter.emit('render')
    doStats()
  }

  function updateStats (stats) {
    state.stats = stats
    emitter.emit('render')
  }

  function doStats () {
    const data = state.geojson.features
    const stats = Object.assign({}, defaultStats)
    data.map(function (vehicle) {
      stats.busCount++
      stats.totalDelay += vehicle.properties.delay
      // if (vehicle.properties.loadPercentage) {
      //   switch (vehicle.properties.loadPercentage) {
      //     case 0:
      //       stats.loadPerCount[0]++
      //       return
      //     case 70:
      //       stats.loadPerCount[1]++
      //       return
      //     case 90:
      //       stats.loadPerCount[1]++
      //       return
      //   }
      // }
    })
    stats.avgDelay = +(stats.totalDelay/stats.busCount).toFixed(2)
    emitter.emit('update-stats', stats)
  }

  function fetchData () {
    archive.createReadStream('/vehicles.json')
      .pipe(ndjson.parse())
      .on('data', function (data) {
        state.geojson.features.push(data)
      })
      .on('end', function () {
        emitter.emit('render')
        doStats()
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
