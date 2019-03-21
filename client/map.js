const Nanocomponent = require('nanocomponent')
const nanologger = require('nanologger')
const mapboxgl = require('mapbox-gl')
const onIdle = require('on-idle')
const html = require('choo/html')
const style = require('./map-style')

class Map extends Nanocomponent {
  constructor () {
    super()

    this._log = nanologger('map')
    this._map = null

    mapboxgl.accessToken = 'pk.eyJ1Ijoiam9lYWhhbmQiLCJhIjoiaDd1MEJZQSJ9.fl3WTCt8MGNOSCGR_qqz7A'
    this.state = Object.assign({}, style)
  }

  createElement (props) {
    this.state = Object.assign(this.state, props)
    return html`
      <div class="vh-100" style="min-height:500px" id="map"></div>
    `
  }

  beforerender (el) {
    const opts = Object.assign({container: el}, this.state)
    this._log.info('create-map', opts)
    this._map = new mapboxgl.Map(opts)
  }

  load () {
    this._log.info('load', this.state)
    this._map.resize()
  }

  getMap () {
    return this._map
  }

  update (props) {
    // Decide if you want to update or make new el
    if (!this._map) return this._log.warn('missing map', 'failed to update')
    this._log.info('update', props)
    const self = this
    const geojson = props.geojson

    if (!geojson || !geojson.features.length) return false
    if (!self._map.getSource('vehicles')) return self._addSource()

    // TODO: check if changed
    onIdle(function () {
      self.state.geojson = geojson
      self._map.getSource('vehicles').setData(geojson)
    })
  }

  _addSource () {
    const self = this

    self._log.info('adding source')
    self._map.addSource('vehicles', { type: 'geojson', data: self.state.geojson })
    addLayers()

    // self._log.info('is loaded', self._map.isStyleLoaded())
    // if (self._map.isStyleLoaded()) addLayers()
    // else self._map.on('load', addLayers)

    return false

    function addLayers () {
      self._log.info('adding layers')
      self._map.addLayer({
        'id': 'rail',
        'type': 'symbol',
        'source': 'vehicles',
        'layout': {
          'icon-image': 'rail-15',
          'icon-allow-overlap': true
        },
        'filter': ['==', 'type', 'rail']
      })
      // self._map.addLayer({
      //   "id": "bus-delay",
      //   "type": "circle",
      //   "source": "vehicles",
      //   'paint': {
      //     'circle-opacity': 0.5,
      //     'circle-radius': {
      //       property: 'delay',
      //       type: 'exponential',
      //       stops: [
      //         [0, 10],
      //         [600, 20]
      //       ]
      //     }
      //   },
      //   "filter": ["==" , "type" , "bus"]
      // })
      self._map.addLayer({
        'id': 'bus',
        'type': 'symbol',
        'source': 'vehicles',
        'layout': {
          'icon-image': 'bus-15',
          'icon-allow-overlap': true
        },
        'filter': ['==', 'type', 'bus']
      })
    }
  }

  unload () {
    this._log.info('unload')
    this._map.remove()
    this._map = null
    this.state = null
  }
}

module.exports = Map
