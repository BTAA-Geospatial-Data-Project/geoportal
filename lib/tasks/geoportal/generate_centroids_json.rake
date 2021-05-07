require 'rsolr'

namespace :geoportal do
  desc 'Generate homepage centroids for map clustering'
  task generate_centroids_json: :environment do
    # Search request
    response = Blacklight.default_index.connection.get 'select', :params => {:q => '!suppressed_b:true', :rows => '100000'}

    docs = []
    response["response"]["docs"].each_with_index do |doc, index|
      begin
        if doc.key?('dcat_centroid_ss') && !doc['dcat_centroid_ss'].empty?
          entry = {}
          entry['l'] = doc['geomg_id_s']
          entry['t'] = ActionController::Base.helpers.truncate(doc['dct_title_s'], length: 50)
          lat,lng    = doc['dcat_centroid_ss'].split(",")
          lat = lat.to_f.round(4) # Truncate long values
          lng = lng.to_f.round(4) # Truncate long values
          entry['c'] = "#{lat},#{lng}"
          docs << entry
        end
      rescue Exception => e
        puts "Caught #{e}"
        puts "BBox or centroid no good - #{doc['geomg_id_s']}"
      end
    end

    centroids_file = "#{Rails.root}/public/centroids.json"
    File.open(centroids_file, "w"){|f| f.write(JSON.generate(docs))}
  end
end
