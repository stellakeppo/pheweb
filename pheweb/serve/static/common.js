'use strict'

window.debug = window.debug || {}

const matchURL = (m) => {
  const { variant, pheno, gene, error } = m
  var url = `/error/${m}`
  if (variant != null) {
    url = `/variant/${variant}`
  } else if (pheno != null) {
    url = `/pheno/${pheno}`
  } else if (gene != null) {
    url = `/gene/${gene}`
  } else if (error != null) {
    url = `/error/${error}`
    throw Error(`failure to parse : '${m}'`)
  }
  return url

}

(function () {
  // It's unfortunate that these are hard-coded, but it works pretty great, so I won't change it now.
  var autocompleteBloodhound = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('display'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    identify: function (sugg) { return sugg.display }, // maybe allows Bloodhound to `.get()`  objects
    remote: {
      url: '/api/autocomplete?query=%QUERY',
      wildcard: '%QUERY',
      rateLimitBy: 'throttle',
      rateLimitWait: 500,
      transform: function (data) {
        // Probably this function reveals that I don't understand Bloodhound.
        // But, I want my previous results to stay around while I keep typing.
        // If the string that's currently in the searchbox matches some string that's been suggested before, I want to see it!
        // This especially happens while I'm typing a chrom-pos-ref-alt.  If what I'm typing agrees with something being suggested, it shouldn't disappear!
        // So, I'm just adding everything to the local index. (Note: NOT localstorage.)
        // Bloodhound appears to perform deduping.
        data = data.map((d) => {
          const url = matchURL(d)
          return { ...d, url }
        })
        autocompleteBloodhound.add(data)
        return data
      },
    },
    sorter: function (a, b) { return (a.display > b.display) ? 1 : -1 },
  })

  $(function () {
    $('.typeahead').typeahead({
      hint: false,
      highlight: true,
      minLength: 1,
    }, {
      name: 'autocomplete',
      source: autocompleteBloodhound,
      display: 'value',
      limit: 100,
      templates: {
        suggestion: _.template('<div><%= display %></div>'),
        empty: '<div class=\'tt-empty-message\'>No matches found.</div>'
      }
    })

    $('.typeahead').bind('typeahead:select', function (ev, suggestion) {
      window.location.href = suggestion.url
    })
  })
})()

// convenience functions
function fmt (format) {
  var args = Array.prototype.slice.call(arguments, 1)
  return format.replace(/{(\d+)}/g, function (match, number) {
    return (typeof args[number] != 'undefined') ? args[number] : match
  })
}

// deal with IE11 problems
if (!Math.log10) { Math.log10 = function (x) { return Math.log(x) / Math.LN10 } }
if (!!window.MSInputMethodContext && !!document.documentMode) { /* ie11 */
  $('<style type=text/css>.lz-locuszoom {height: 400px;}</style>').appendTo($('head'))
}

// nice scientific notation
function pValueToReadable (p) {
  if (!_.isNumber(p)) {
    return NaN
  }
  var pReadable = p
  if (p === Number.MIN_VALUE) {
    pReadable = '< ' + pReadable
  } else if (p < 0.01) {
    pReadable = pReadable.toExponential(1)
    var expIndex = pReadable.indexOf('e')
    var base = pReadable.substring(0, expIndex)
    var exponent = pReadable.substring(expIndex + 1)
    // TODO vertically align 'x' to middle (vertical-align, line-height, padding don't seem to work)
    pReadable = base + ' <span style="font-size: 0.675em">x</span> 10<sup>' + exponent + '</sup>'
  } else {
    pReadable = pReadable.toPrecision(1)
  }
  return pReadable
}

function exportTableToCSV ($table, filename, exportCols = null, prefixCols = null) {
  var sTableData = $table.data('st').getData()
  var colDelim = '\t'
  var rowDelim = '\r\n'

  function getData (row, exportCols, prefixCols) {
    var ret = []
    if (prefixCols != null) {
      ret = Object.keys(prefixCols).sort().map(key => prefixCols[key])
    }
    return ret.concat(exportCols.map(col => {
      var s = col.split('.')
      var val = row
      s.forEach(s => {
        val = val[s] || 'NA'
      })
      return val
    }))
  }

  function getFields (object, values = true, gather_name = []) {
    var result = []
    Object.keys(object).sort().forEach(function (prop) {
      var element = object[prop]
      if (element !== Object(element)) {
        var fqName = gather_name.length > 0 ? gather_name.join('.') + '.' + prop : prop
        prop = values ? prop : fqName
        if (values) { result.push(element) } else { result.push(prop) }
      } else {
        gather_name.push(prop)
        result = result.concat(getFields(element, values, gather_name))
        gather_name.pop()
      }
    })
    return result
  }

  var headers = exportCols
  console.log(getFields(sTableData[0], false))
  if (exportCols == null) {
    var header = getFields(sTableData[0], false)
    var acceptInd = exportCols != null ? exportCols.map(function (elem) { return header.indexOf(elem) }).filter(function (ind) { return ind >= 0}) : null
    headers = acceptInd.map(function (elem) { return header[elem] })
  }

  var csv
  if (prefixCols != null) {
    csv = Object.keys(prefixCols).sort().concat(headers).join(colDelim)
  } else {
    csv = headers.join(colDelim)
  }
  csv += rowDelim
  csv += sTableData.map(function (row) { return getData(row, headers, prefixCols).join(colDelim) }).join(rowDelim)

  var createObjectURL = (window.URL || window.webkitURL || {}).createObjectURL || function () {}
  var csvFile = new Blob([csv], { type: 'text/csv' })
  var csvData = createObjectURL(csvFile)
  $(this)
    .attr({
      download: filename,
      href: csvData
      // ,'target' : '_blank' //if you want it to open in a new window
    })
}

function CreateReqPromise (method, url, body, headers, timeout) {
  var response = Q.defer()
  var xhr = new XMLHttpRequest()
  if ('withCredentials' in xhr) {
    // Check if the XMLHttpRequest object has a "withCredentials" property.
    // "withCredentials" only exists on XMLHTTPRequest2 objects.
    xhr.open(method, url, true)
  } else if (typeof XDomainRequest != 'undefined') {
    // Otherwise, check if XDomainRequest.
    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
    xhr = new XDomainRequest()
    xhr.open(method, url)
  } else {
    // Otherwise, CORS is not supported by the browser.
    xhr = null
  }
  if (xhr) {
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 0) {
          response.resolve(xhr.response)
        } else {
          response.reject('HTTP ' + xhr.status + ' for ' + url)
        }
      }
    }
    timeout && setTimeout(response.reject, timeout)
    body = typeof body !== 'undefined' ? body : ''
    if (typeof headers !== 'undefined') {
      for (var header in headers) {
        xhr.setRequestHeader(header, headers[header])
      }
    }
    // Send the request
    xhr.send(body)
  }
  return response.promise
}

/* Search box
 * when the user hit enter send a request
 * to /api/go=${query}
 * if null is returned send them to to not
 * found other wise navigate to the match
 * returned.
 */
const handler = (element) => {
  const submitSearch = (event) => {
    event.preventDefault()
    const query = event.target.query.value
    const args = new URLSearchParams({ query }).toString()
    const handler = (queryResult) => {
      let url
      if (queryResult == null) {
        url = `/notfound?${args}`
      } else {
        url = matchURL(queryResult)
      }
      window.location.href = url
    }
    fetch(`/api/go?${args}`)
      .then(response => response.json())
      .then(handler)
    return false
  }
  element.addEventListener('submit', submitSearch)
}

$(document).ready(function () { Array.from(document.getElementsByClassName('searchbox-form')).forEach(handler) })
