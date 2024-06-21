#!/bin/bash

# Récupérer la liste des versions avec leurs IDs
versions=$(gcloud app versions list --format="value(id)" --sort-by=last_deployed_time)

# Supprimer les 150 premières versions de la liste
for version_id in $(echo "$versions" | head -n 150); do
    echo "Suppression de la version $version_id"
    gcloud app versions delete "$version_id" --quiet
done
