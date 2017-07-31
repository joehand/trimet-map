var http = require('http')
var express = require('express')
var hyperdrive = require('hyperdrive')
var discovery = require('hyperdiscovery')
var wss = require('websocket-stream')
var pump = require('pump')
var trimetLive = require('trimet-live-archive')
var storage = require('dat-storage')

var app = express()
var archive = hyperdrive('./archive') //storage('./data'), {latest: true})
var trimet = trimetLive(archive, {appID: process.env.APP_ID, geojson: true})
var UPDATE_INTERVAL = 5000
var port = process.env.PORT || 8080

app.use(express.static('client'))

archive.ready(function (err) {
  if (err) throw err

  console.log('sharing archive on dat', archive.key.toString('hex'))
  discovery(archive)

  // do an initial data fetch
  trimet.fetch(function (err) {
    if (err) throw err
    console.log('fetched initial data')

    var server = app.listen(port, function () {
      console.log('Your app is listening on port ' + port)
    })
    wss.createServer({server: server}, onwebsocket)

    // TODO: filling up glitch server space too fast, need this on a real server
    // Update data!
    setInterval(trimet.fetch, UPDATE_INTERVAL)
  })
})

function onwebsocket (stream) {
  pump(stream, archive.replicate({live: true}), stream, function (err) {
    // console.error(err)
  })
}
