namespace :geoportal do
  desc 'Purge Sidecars and Images'
  task sidecar_purge: :environment do
    # Remove images
    sidecars = SolrDocumentSidecar.all
    sidecars.each do |sc|
      sc.remove_image!
      sc.save
    end

    # Delete all Transitions and Sidecars
    ImageUploadTransition.destroy_all
    SolrDocumentSidecar.destroy_all
  end

  desc 'Delete Sidecars and Images'
  task sidecar_destroy_batch: :environment do
    # Expects a CSV file in Rails.root/tmp/destroy_batch.csv
    #
    # From your local machine, put it there like this:
    # scp destroy_batch.csv swadm@geoprod:/swadm/var/www/geoblacklight/current/tmp/
    CSV.foreach("#{Rails.root}/tmp/destroy_batch.csv", headers: true) do |row|
      sc = SolrDocumentSidecar.find_by(:document_id => row[0])
      sc.destroy
      puts "document_id - #{row[0]} - destroyed"
    end
  end

  desc 'Write state report'
  task sidecar_report: :environment do
    # Create a CSV Dump of Results
    file = "#{Rails.root}/public/#{Time.now.strftime('%Y-%m-%d_%H-%M-%S')}.sidecar_report.csv"

    sidecars = SolrDocumentSidecar.all

    CSV.open(file, 'w') do |writer|
      header = [
        "Sidecar ID",
        "Document ID",
        "Current State",
        "Doc Data Type",
        "Doc Title",
        "Doc Collection",
        "Doc Institution",
        "Error",
        "Viewer Protocol",
        "Image URL",
        "GBLSI Thumbnail URL"
      ]

      writer << header

      sidecars.each do |sc|
        cat = Blacklight::SearchService.new(config: CatalogController.blacklight_config)
        begin
          resp, doc = cat.fetch(sc.document_id)
          writer << [
            sc.id,
            sc.document_id,
            sc.state_machine.current_state,
            doc._source['layer_geom_type_s'],
            doc._source['dct_title_s'],
            doc._source['dct_isPartOf_sm'].join(", "),
            doc._source['schema_provider_s'],
            sc.state_machine.last_transition.metadata['exception'],
            sc.state_machine.last_transition.metadata['viewer_protocol'],
            sc.state_machine.last_transition.metadata['image_url'],
            sc.state_machine.last_transition.metadata['gblsi_thumbnail_uri']
          ]
        rescue
          puts "orphaned / #{sc.document_id}"
          next
        end
      end
    end
  end
end
