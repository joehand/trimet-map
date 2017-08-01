var Nanocomponent = require('nanocomponent')
var nanologger = require('nanologger')
var mapboxgl = require('mapbox-gl')
var onIdle = require('on-idle')
var html = require('choo/html')

module.exports = Map

function Map () {
  if (!(this instanceof Map)) return new Map()
  Nanocomponent.call(this)

  this._log = nanologger('mapbox-gl')
  this.map = null

  mapboxgl.accessToken = 'pk.eyJ1Ijoiam9lYWhhbmQiLCJhIjoiaDd1MEJZQSJ9.fl3WTCt8MGNOSCGR_qqz7A'
  this.opts = {
    style: 'mapbox://styles/joeahand/cj5rh94o22rqz2rqi7i2i5tkq',
    center: [-122.6782433, 45.5252814],
    zoom: 12,
    maxBounds: [
      // Portland area bounds
      [-123.1779407, 45.219892], // Southwest coordinates
      [-122.2815557, 45.699901]  // Northeast coordinates
    ]
  }
}

Map.prototype = Object.create(Nanocomponent.prototype)

Map.prototype.createElement = function (geojson) {
  this.geojson = geojson
  return html`
    <div style="height: 500px">
      <div id="map"></div>
    </div>
  `
}

Map.prototype.update = function (geojson) {
  if (!this.map) return this._log.warn('missing map', 'failed to update')
  if (!geojson.features.length) return false
  // TODO: check if changed
  var self = this
  onIdle(function () {
    self.geojson = geojson
    self._log.info('update-map', geojson)
    self.map.getSource('vehicles').setData(geojson)
  })
  return false
}

Map.prototype.beforerender = function (el) {
  var opts = Object.assign({container: el}, this.opts)
  this._log.info('create-map', opts)
  var map = new mapboxgl.Map(opts)
  this.map = map
}

Map.prototype.load = function () {
  this._log.info('load')
  var self = this

  self.map.resize()
  self.map.on('load', function () {
    self._log.info('map on load')
    self.map.addSource('vehicles', { type: 'geojson', data: self.geojson })
    self.map.addLayer({
      "id": "rail",
      "type": "symbol",
      "source": "vehicles",
      "layout": {
        "icon-image": "rail-15",
        "icon-allow-overlap": true
      },
      "filter": ["==" , "type" , "rail"]
    })
    self.map.addLayer({
      "id": "bus",
      "type": "symbol",
      "source": "vehicles",
      "layout": {
        "icon-image": "bus-15",
        "icon-allow-overlap": true
      },
      "filter": ["==" , "type" , "bus"]
    })
  })
}

Map.prototype.unload = function () {
  this._log.info('unload')

  this.map.remove()
  this.map = null
  this.geojson = null
}
