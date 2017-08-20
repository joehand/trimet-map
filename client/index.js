var html = require('choo/html')
var css = require('sheetify')
var log = require('choo-log')
var choo = require('choo')
var MapEl = require('./map.js')

var stats = require('./components/stats')
var appStore = require('./models/app')

css('mapbox-gl')
css('tachyons')

var app = choo()
var map = new MapEl()

app.use(log())
app.use(appStore)
app.route('/', mainView)
app.mount('body')

function mainView (state, emit) {
  return html`
    <body>
      <main class="cf vh-100 sans-serif">
        <header class="fn fl-ns w-25-ns pr4-ns">
          <article class="pa1 pa3-ns" data-name="slab-stat-small">
            <h3 class="f3 ttu tracked">${state.title}</h3>
            ${stats(state.stats)}
          </article>
        </header>
        <div class="fn fl-ns w-75-ns vh-100">
          ${map.render({geojson: state.geojson})}
        </div>
      </main>
    </body>
  `
}
