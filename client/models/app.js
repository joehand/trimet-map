const wss = require('websocket-stream')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const pump = require('pump')
const ndjson = require('ndjson')

const config = require('../../config') // TODO: real config

module.exports = function store (state, emitter) {
  const archive = hyperdrive(ram, config.archive, {sparse: true})
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
    replicate()
    fetchData()
  })

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
    emitter.emit('log:info', 'replicate')
    var wsProtocol = (window.location.protocol === 'https:') ? 'wss://' : 'ws://'
    var wsUrl = config.wsUrl || wsProtocol + location.host // ???
    var ws = wss(wsUrl)
    ws.on('connect', function () {
      emitter.emit('log:info', 'websockets connected')
      // TODO: if we got disconnected during initial fetch, try again
      // if (!initialFetchDone && mapLoaded) fetchData()
    })
    pump(ws, archive.replicate({live: true}), ws, function (err) {
      setTimeout(replicate, 500)
    })
  }
}
