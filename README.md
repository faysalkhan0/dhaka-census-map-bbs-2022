# Dhaka Census 2022 Map

Map-first Next.js + Mapbox web app for the Dhaka 2022 Population and Housing Census.

## Data model
- Geography join key: `matched_key`
- Navigation parent: `navigation_parent_key` when present, otherwise `parent_geo_uid`
- `city_thana` is navigation/support geography under the City Corporation branch.
- Mauza/Village geometry is loaded separately to keep the first map payload smaller.

## Local environment
Set `NEXT_PUBLIC_MAPBOX_TOKEN` to a Mapbox public token before running the app.
