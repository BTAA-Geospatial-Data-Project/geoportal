Blacklight.onLoad(function() {
  $('[data-map="home"]').each(function(i, element) {

    var geoblacklight = new GeoBlacklight.Viewer.Map(this),
        data = $(this).data();

    geoblacklight.map.setZoom(2);
    geoblacklight.map.addControl(L.control.geosearch({
      baseUrl: data.catalogPath,
      dynamic: false,
      searcher: function() {
        window.location.href = this.getSearchUrl();
      },
      staticButton: '<a id="map-search-btn" class="btn btn-primary hidden-xs hidden-sm">Search here</a>'
    }));

    var progress = document.getElementById('progress');
    var progressBar = document.getElementById('progress-bar');

    function updateProgressBar(processed, total, elapsed, layersArray) {
      if (elapsed > 100) {
        // if it takes more than a second to load, display the progress bar:
        progress.style.display = 'block';
        progressBar.style.width = Math.round(processed/total*100) + '%';
      }

      if (processed === total) {
        // all markers processed - hide the progress bar:
        progress.style.display = 'none';
      }
    }

    var markers = L.markerClusterGroup({ chunkedLoading: true, chunkProgress: updateProgressBar });
    var markerList = [];

    // Oboe - SAX steam JSON results from Solr /export
    // oboe('http://localhost:8983/solr/geoportal/export?fl=uuid_sdv,dc_title_sdv,centroid_sdv&indent=on&q=*:*&wt=json&sort=dc_title_sdv%20asc&rows=10000')
    
    oboe('/centroids.json')
      .node('*', function( doc ){
          if(typeof doc.b1g_centroid_ss != 'undefined'){
            var latlng = doc.b1g_centroid_ss.split(",")
            var marker = L.marker([latlng[0],latlng[1]]).bindPopup("<a href='/catalog/" + doc.layer_slug_s + "'>" + doc.dc_title_s + "</a>")
            markerList.push(marker);
          }
        }
      )
      .done(function(){
        markers.addLayers(markerList)
        geoblacklight.map.addLayer(markers);
      })
  });
});
