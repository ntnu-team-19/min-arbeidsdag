import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import type { Pixel } from 'ol/pixel';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

export type ThemeMapBaseLayer = 'grayscale' | 'dark';

export function createTileSource(layer: ThemeMapBaseLayer): OSM | XYZ {
  if (layer === 'dark') {
    return new XYZ({
      url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      attributions: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 20,
    });
  }

  return new XYZ({
    url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    attributions: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 20,
  });
}

export function createAssignmentMap(args: {
  target: HTMLElement;
  compact: boolean;
  tileLayer: TileLayer<OSM | XYZ>;
  routeLayer: VectorLayer;
  markerLayer: VectorLayer;
  userLocationLayer: VectorLayer;
}): OlMap {
  return new OlMap({
    target: args.target,
    layers: [args.tileLayer, args.routeLayer, args.markerLayer, args.userLocationLayer],
    view: new View({
      center: fromLonLat([10.3951, 63.4305]),
      zoom: args.compact ? 13 : 12,
    }),
  });
}

export function isMapClickEvent(event: unknown): event is { pixel: Pixel } {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const pixel = (event as { pixel?: unknown }).pixel;
  return (
    Array.isArray(pixel) &&
    pixel.length === 2 &&
    typeof pixel[0] === 'number' &&
    typeof pixel[1] === 'number'
  );
}

export function emitMarkerAtPixel(args: {
  map: OlMap;
  pixel: Pixel;
  markerLayer: VectorLayer;
  onMarkerSelected: (assignmentFeature: Feature) => void;
}): void {
  args.map.forEachFeatureAtPixel(
    args.pixel,
    (feature) => {
      const assignment = feature.get('assignment');
      if (!assignment) {
        return false;
      }

      args.onMarkerSelected(feature as Feature);
      return true;
    },
    {
      layerFilter: (layer) => layer === args.markerLayer,
    },
  );
}
