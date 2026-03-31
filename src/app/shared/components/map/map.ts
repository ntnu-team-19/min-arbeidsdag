import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature, { FeatureLike } from 'ol/Feature';
import type BaseEvent from 'ol/events/Event';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import type { Pixel } from 'ol/pixel';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import {
  boundingExtent,
  createEmpty,
  extend as extendExtent,
  isEmpty as isEmptyExtent,
} from 'ol/extent';
import { ThemeService } from '../../../core/services/theme.service';
import {
  Assignment,
  MapLocation,
  MapRouteSegment,
  MapStop,
  MapStopKind,
} from './map.models';
import { TranslatePipe } from '@ngx-translate/core';
export type { Assignment, MapLocation, MapRouteSegment, MapStop } from './map.models';

interface FocusAssignmentOptions {
  zoom?: number;
  duration?: number;
  targetXRatio?: number;
  targetYRatio?: number;
}

interface FocusAssignmentLegOptions extends FocusAssignmentOptions {
  fromStop?: MapStop;
  toStop?: MapStop;
  routeSegment?: MapRouteSegment;
}

@Component({
  selector: 'app-assignment-map',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class AssignmentMap implements AfterViewInit, OnDestroy, OnChanges {
  @Input() assignments: Assignment[] = [];
  @Input() stops: MapStop[] = [];
  @Input() routeSegments: MapRouteSegment[] = [];
  @Input() activeSegmentId: string | null = null;
  @Input() compact = false;
  @Output() markerClicked = new EventEmitter<Assignment>();

  private map?: OlMap;
  private readonly markerSource = new VectorSource();
  private readonly routeSource = new VectorSource();
  private readonly markerLayer = new VectorLayer({
    source: this.markerSource,
    style: (feature) => this.getMarkerStyle(feature),
  });
  private readonly routeLayer = new VectorLayer({
    source: this.routeSource,
    style: (feature) => this.getRouteStyle(feature),
  });

  mapLoaded = false;
  mapError = false;
  private cdr = inject(ChangeDetectorRef);
  private readonly themeService = inject(ThemeService);
  private tileLayer?: TileLayer<OSM | XYZ>;
  private currentTheme: 'light' | 'dark' = 'light';
  private themeCheckInterval?: ReturnType<typeof setInterval>;
  private viewChangeListener?: (event: BaseEvent) => void;

  ngOnChanges(): void {
    this.updateMapFeatures();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try {
        const mapElement = document.getElementById('assignment-map');

        if (!mapElement) {
          throw new Error('Map container element not found');
        }

        if (mapElement.offsetHeight === 0 || mapElement.offsetWidth === 0) {
          throw new Error(
            `Map container has invalid dimensions: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`,
          );
        }

        this.currentTheme = this.themeService.isDark() ? 'dark' : 'light';

        this.tileLayer = new TileLayer({
          source: this.createTileSource(this.currentTheme),
        });

        this.map = new OlMap({
          target: mapElement,
          layers: [this.tileLayer, this.routeLayer, this.markerLayer],
          view: new View({
            center: fromLonLat([10.3951, 63.4305]),
            zoom: this.compact ? 13 : 12,
          }),
        });

        this.map.on('click', this.onMapClick);
        this.attachViewChangeListener();
        this.updateMapFeatures();

        this.mapLoaded = true;
        this.mapError = false;
        this.cdr.detectChanges();

        this.setupThemeListener();
      } catch (error) {
        console.error('[Map] Failed to initialize map:', error);
        this.mapLoaded = false;
        this.mapError = true;
        this.cdr.detectChanges();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.themeCheckInterval) {
      clearInterval(this.themeCheckInterval);
    }

    if (this.map) {
      const view = this.map.getView();
      if (this.viewChangeListener) {
        view.un('change:resolution', this.viewChangeListener);
      }
      this.map.un('click', this.onMapClick);
      this.map.setTarget(undefined);
      this.map = undefined;
    }
  }

  focusAssignment(assignment: Assignment, options: FocusAssignmentOptions = {}): void {
    if (!this.map || !this.hasValidCoordinates(assignment)) {
      return;
    }

    const location = assignment.location;
    const size = this.map.getSize();
    if (!size) {
      return;
    }

    const view = this.map.getView();
    const currentCenter = view.getCenter();
    const currentZoom = view.getZoom();
    const nextZoom = Math.max(currentZoom ?? 0, options.zoom ?? (this.compact ? 14 : 16));

    if (!currentCenter || currentZoom == null) {
      return;
    }

    const targetXRatio = this.clamp(options.targetXRatio ?? 0.5, 0, 1);
    const targetYRatio = this.clamp(options.targetYRatio ?? 0.5, 0, 1);
    const coordinate = fromLonLat([location.lon, location.lat]);

    view.setZoom(nextZoom);
    view.centerOn(coordinate, size, [size[0] * targetXRatio, size[1] * targetYRatio]);
    const targetCenter = view.getCenter();
    view.setCenter(currentCenter);
    view.setZoom(currentZoom);

    if (!targetCenter) {
      return;
    }

    view.animate({
      center: targetCenter,
      zoom: nextZoom,
      duration: options.duration ?? 350,
    });
  }

  focusAssignmentLeg(options: FocusAssignmentLegOptions = {}): void {
    const toStop = options.toStop;
    const fromStop = options.fromStop;

    if (!toStop || !this.hasValidCoordinates(toStop)) {
      return;
    }

    if (!this.map || !fromStop || !this.hasValidCoordinates(fromStop)) {
      this.focusAssignment(this.mapStopToAssignment(toStop), options);
      return;
    }

    if (options.routeSegment && options.routeSegment.coordinates.length >= 2) {
      this.fitCoordinates(options.routeSegment.coordinates, options);
      return;
    }

    this.fitCoordinates(
      [
        [fromStop.location.lon, fromStop.location.lat],
        [toStop.location.lon, toStop.location.lat],
      ],
      options,
    );
  }

  private setupThemeListener(): void {
    const checkTheme = () => {
      const isDark = this.themeService.isDark();
      const newTheme = isDark ? 'dark' : 'light';

      if (newTheme !== this.currentTheme && this.tileLayer) {
        this.currentTheme = newTheme;
        this.updateTileLayer();
      }
    };

    this.themeCheckInterval = setInterval(() => {
      if (!this.mapLoaded) {
        if (this.themeCheckInterval) {
          clearInterval(this.themeCheckInterval);
        }
        return;
      }
      checkTheme();
    }, 500);
  }

  private attachViewChangeListener(): void {
    if (!this.map) {
      return;
    }

    const view = this.map.getView();
    this.viewChangeListener = () => {
      this.markerLayer.changed();
    };
    view.on('change:resolution', this.viewChangeListener);
  }

  private readonly onMapClick = (event: unknown) => {
    if (!this.map || !this.isMapClickEvent(event)) {
      return;
    }

    this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const assignment = feature.get('assignment') as Assignment | undefined;
      if (!assignment) {
        return false;
      }

      this.markerClicked.emit(assignment);
      return true;
    });
  };

  private updateMapFeatures(): void {
    this.updateRouteSegments();
    this.updateMarkers();
    this.fitToVisibleFeatures();
  }

  private updateRouteSegments(): void {
    this.routeSource.clear(true);

    const features = this.routeSegments
      .filter((segment) => segment.coordinates.length >= 2)
      .map(
        (segment) =>
          new Feature({
            geometry: new LineString(segment.coordinates.map(([lon, lat]) => fromLonLat([lon, lat]))),
            segmentId: segment.id,
            active: segment.id === this.activeSegmentId,
          }),
      );

    this.routeSource.addFeatures(features);
  }

  private updateMarkers(): void {
    this.markerSource.clear(true);

    const assignmentLookup = new globalThis.Map(
      this.assignments.map((assignment) => [String(assignment.id), assignment]),
    );
    const markerFeatures = this.getRenderableStops()
      .filter((stop): stop is MapStop & { location: { lat: number; lon: number } } =>
        this.hasValidCoordinates(stop),
      )
      .map((stop) => {
        const assignment =
          stop.kind === 'assignment'
            ? assignmentLookup.get(stop.assignmentId ?? '') ?? this.mapStopToAssignment(stop)
            : undefined;

        return new Feature({
          geometry: new Point(fromLonLat([stop.location.lon, stop.location.lat])),
          stopKind: stop.kind,
          stopLabel: stop.label,
          markerLabel: this.getMarkerLabel(stop),
          assignment,
        });
      });

    this.markerSource.addFeatures(markerFeatures);
  }

  private fitToVisibleFeatures(): void {
    if (!this.map) {
      return;
    }

    const extent = createEmpty();
    let hasFeatures = false;

    const markerExtent = this.markerSource.getExtent();
    if (markerExtent && !isEmptyExtent(markerExtent)) {
      extendExtent(extent, markerExtent);
      hasFeatures = true;
    }

    const routeExtent = this.routeSource.getExtent();
    if (routeExtent && !isEmptyExtent(routeExtent)) {
      extendExtent(extent, routeExtent);
      hasFeatures = true;
    }

    if (!hasFeatures) {
      return;
    }

    this.map.getView().fit(extent, {
      padding: [40, 40, 40, 40],
      maxZoom: this.compact ? 14 : 16,
      duration: 200,
    });
  }

  private fitCoordinates(
    coordinates: Array<[number, number]>,
    options: FocusAssignmentOptions = {},
  ): void {
    if (!this.map || coordinates.length === 0) {
      return;
    }

    const size = this.map.getSize();
    if (!size) {
      return;
    }

    const projectedCoordinates = coordinates.map(([lon, lat]) => fromLonLat([lon, lat]));
    const extent = boundingExtent(projectedCoordinates);
    const targetYRatio = this.clamp(options.targetYRatio ?? 0.5, 0, 1);
    const basePadding = 40;
    const bottomPaddingAdjustment = Math.max(0, size[1] * (1 - 2 * targetYRatio));

    this.map.getView().fit(extent, {
      padding: [basePadding, basePadding, basePadding + bottomPaddingAdjustment, basePadding],
      maxZoom: options.zoom ?? (this.compact ? 14 : 16),
      duration: options.duration ?? 350,
    });
  }

  private getRenderableStops(): MapStop[] {
    if (this.stops.length > 0) {
      return this.removeDuplicateTerminalStop(this.stops);
    }

    return this.assignments.map((assignment) => ({
      id: String(assignment.id),
      kind: 'assignment',
      label: assignment.name,
      assignmentId: String(assignment.id),
      location: assignment.location,
    }));
  }

  private removeDuplicateTerminalStop(stops: MapStop[]): MapStop[] {
    if (stops.length < 2) {
      return stops;
    }

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    if (
      firstStop?.kind === 'start' &&
      lastStop?.kind === 'end' &&
      this.haveSameCoordinates(firstStop, lastStop)
    ) {
      return stops.slice(0, -1);
    }

    return stops;
  }

  private getMarkerStyle(feature: FeatureLike): Style {
    const stopKind = feature.get('stopKind') as MapStopKind | undefined;
    const markerLabel = feature.get('markerLabel') as string | undefined;
    const markerScale = this.getMarkerScale();

    if (stopKind === 'start') {
      return new Style({
        image: new Icon({
          src: '/icons/home-pin.svg',
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: 0.9 * markerScale,
        }),
        zIndex: 25,
      });
    }

    const fillColor = stopKind === 'end' ? '#D65A4A' : '#1F4E79';
    const radius = (stopKind === 'assignment' ? 16 : 13) * markerScale;
    const fontSize = Math.max(10, Math.round(12 * markerScale));

    return new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({
          color: '#FFFFFF',
          width: 3,
        }),
      }),
      text: new Text({
        text: markerLabel ?? '',
        fill: new Fill({ color: '#FFFFFF' }),
        font: `700 ${fontSize}px sans-serif`,
        textAlign: 'center',
        textBaseline: 'middle',
      }),
      zIndex: stopKind === 'assignment' ? 20 : 25,
    });
  }

  private getMarkerScale(): number {
    const zoom = this.map?.getView().getZoom() ?? (this.compact ? 13 : 12);

    if (zoom >= 13) {
      return 1;
    }

    if (zoom >= 11) {
      return 0.85;
    }

    if (zoom >= 9) {
      return 0.72;
    }

    return 0.62;
  }

  private getRouteStyle(feature: FeatureLike): Style | Style[] {
    const isActive = feature.get('active') === true;

    if (isActive) {
      return [
        new Style({
          stroke: new Stroke({
            color: 'rgba(11, 74, 139, 0.28)',
            width: 14,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          zIndex: 14,
        }),
        new Style({
          stroke: new Stroke({
            color: '#D9E9F8',
            width: 9,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          zIndex: 15,
        }),
        new Style({
          stroke: new Stroke({
            color: '#0B4A8B',
            width: 6,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          zIndex: 16,
        }),
      ];
    }

    return new Style({
      stroke: new Stroke({
        color: 'rgba(107, 127, 146, 0.55)',
        width: 3,
        lineCap: 'round',
        lineJoin: 'round',
      }),
      zIndex: 10,
    });
  }

  private getMarkerLabel(stop: MapStop): string {
    if (stop.kind === 'start') {
      return 'S';
    }

    if (stop.kind === 'end') {
      return 'E';
    }

    return stop.sequenceNumber != null ? String(stop.sequenceNumber) : '';
  }

  private mapStopToAssignment(stop: MapStop): Assignment {
    return {
      id: stop.assignmentId ?? stop.id,
      name: stop.label,
      location: stop.location,
      description: stop.label,
    };
  }

  private createTileSource(theme: 'light' | 'dark'): OSM | XYZ {
    if (theme === 'dark') {
      return new XYZ({
        url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        attributions: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 20,
      });
    }

    return new OSM({
      attributions: '© OpenStreetMap contributors',
    });
  }

  private updateTileLayer(): void {
    if (!this.tileLayer) {
      return;
    }

    this.tileLayer.setSource(this.createTileSource(this.currentTheme));
  }

  private hasValidCoordinates(
    item: Assignment | MapStop,
  ): item is (Assignment | MapStop) & { location: { lat: number; lon: number } } {
    const lat = item.location?.lat;
    const lon = item.location?.lon;

    return (
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      typeof lon === 'number' &&
      Number.isFinite(lon) &&
      lon >= -180 &&
      lon <= 180
    );
  }

  private haveSameCoordinates(a: Assignment | MapStop, b: Assignment | MapStop): boolean {
    if (!this.hasValidCoordinates(a) || !this.hasValidCoordinates(b)) {
      return false;
    }

    return a.location.lat === b.location.lat && a.location.lon === b.location.lon;
  }

  private isMapClickEvent(
    event: unknown,
  ): event is {
    pixel: Pixel;
  } {
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

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
