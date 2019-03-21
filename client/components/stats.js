const html = require('choo/html')
const moment = require('moment')

module.exports = function (stats) {
  if (!stats || !stats.busCount) return ''

  return html`
      <div>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Total Vehicles</dd>
          <dd class="f3 fw6 ml0">${stats.busCount}</dd>
        </dl>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Total Delay</dd>
          <dd class="f3 fw6 ml0">${delay(stats.totalDelay)}</dd>
        </dl>
        <dl class="db lh-title">
          <dd class="f5 fw4 ml0">Average Delay</dd>
          <dd class="f3 fw6 ml0">${delay(stats.avgDelay)}</dd>
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
