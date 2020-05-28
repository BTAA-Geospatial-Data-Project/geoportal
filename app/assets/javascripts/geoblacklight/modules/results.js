Blacklight.onLoad(function() {
  var historySupported = !!(window.history && window.history.pushState);

  if (historySupported) {
    History.Adapter.bind(window, 'statechange', function() {
      var state = History.getState();
      updatePage(state.url);
    });
  }

  $('[data-map="index"]').each(function() {
    var data = $(this).data(),
    opts = { baseUrl: data.catalogPath },
    geoblacklight, bbox;

    var lngRe = '(-?[0-9]{1,2}(\\.[0-9]+)?)';
    var latRe = '(-?[0-9]{1,3}(\\.[0-9]+)?)';

    var parseableBbox = new RegExp(
      [lngRe,latRe,lngRe,latRe].join('\\s+')
    );

    if (typeof data.mapBbox === 'string') {
      bbox = L.bboxToBounds(data.mapBbox);
    } else {
      $('.document [data-bbox]').each(function() {
        var currentBbox = $(this).data().bbox;
        if (parseableBbox.test(currentBbox)) {
          if (typeof bbox === 'undefined') {
            bbox = L.bboxToBounds(currentBbox);
          } else {
            bbox.extend(L.bboxToBounds(currentBbox));
          }
        } else {
          // bbox not parseable, use default value.
          // [[-180, -90], [180, 90]];
          bbox = L.bboxToBounds("-180 -90 180 90");
        }
      });
    }


    if (!historySupported) {
      $.extend(opts, {
        dynamic: false,
        searcher: function() {
          window.location.href = this.getSearchUrl();
        }
      });
    }

    // instantiate new map
    geoblacklight = new GeoBlacklight.Viewer.Map(this, { bbox: bbox });

    var markers = L.markerClusterGroup();

    // Send Oboe to admin/api for non-web-ui attributes like centroid
    // Not usingURL() to maintain legacy IE support
    url = document.createElement('a');
    url.href = window.location.href;
    url.pathname = '/admin/api.json'
    // Oboe - Re-query Solr for JSON results
    oboe(url.toString() + '&format=json&per_page=1000&rows=10000')
      .node('data.*', function( doc ){
          if(typeof doc['attributes']['b1g_centroid_ss'] != 'undefined'){
            var latlng = doc['attributes']['b1g_centroid_ss']['attributes']['value'].split(",")
            markers.addLayer(L.marker([latlng[0],latlng[1]]).bindPopup("<a href='/catalog/" + doc['attributes']['layer_slug_s']['attributes']['value'] + "'>" + doc['attributes']['dc_title_s']['attributes']['value'] + "</a>"));
          }
        }
      )
      .done(function(){
        geoblacklight.map.addLayer(markers);
      })

    // set hover listeners on map
    $('#content')
      .on('mouseenter', '#documents [data-layer-id]', function() {
        var bounds = L.bboxToBounds($(this).data('bbox'));
        geoblacklight.addBoundsOverlay(bounds);
      })
      .on('mouseleave', '#documents [data-layer-id]', function() {
        geoblacklight.removeBoundsOverlay();
      });

    // add geosearch control to map
    geoblacklight.map.addControl(L.control.geosearch(opts));
  });

  function updatePage(url) {
    $.get(url).done(function(data) {
      var resp = $.parseHTML(data);
      $doc = $(resp);
      $('#documents').replaceWith($doc.find('#documents'));
      $('#sidebar').replaceWith($doc.find('#sidebar'));
      $('#sortAndPerPage').replaceWith($doc.find('#sortAndPerPage'));
      $('#appliedParams').replaceWith($doc.find('#appliedParams'));
      if ($('#map').next().length) {
        $('#map').next().replaceWith($doc.find('#map').next());
      } else {
        $('#map').after($doc.find('#map').next());
      }
    });
  }

});
