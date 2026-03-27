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
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import type { Pixel } from 'ol/pixel';
import { fromLonLat } from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import { ThemeService } from '../../../core/services/theme.service';

export interface Assignment {
  id: string | number;
  name: string;
  location?: { lat?: number | null; lon?: number | null } | null;
  description?: string;
}

interface FocusAssignmentOptions {
  zoom?: number;
  duration?: number;
  targetXRatio?: number;
  targetYRatio?: number;
}

@Component({
  selector: 'app-assignment-map',
  standalone: true,
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class AssignmentMap implements AfterViewInit, OnDestroy, OnChanges {
  @Input() assignments: Assignment[] = [];
  @Input() compact = false;
  @Output() markerClicked = new EventEmitter<Assignment>();

  private map?: Map;
  private readonly markerSource = new VectorSource();
  private readonly markerLayer = new VectorLayer({
    source: this.markerSource,
    style: new Style({
      image: new Icon({
        src: '/icons/map-pin.svg',
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 1.35,
      }),
    }),
  });

  mapLoaded = false;
  mapError = false;
  private cdr = inject(ChangeDetectorRef);
  private readonly themeService = inject(ThemeService);
  private tileLayer?: TileLayer<OSM | XYZ>;
  private currentTheme: 'light' | 'dark' = 'light';
  private themeCheckInterval?: ReturnType<typeof setInterval>;

  ngOnChanges(): void {
    this.updateMarkers();
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

        // Get initial theme
        this.currentTheme = this.themeService.isDark() ? 'dark' : 'light';

        this.tileLayer = new TileLayer({
          source: this.createTileSource(this.currentTheme),
        });

        this.map = new Map({
          target: mapElement,
          layers: [this.tileLayer, this.markerLayer],
          view: new View({
            center: fromLonLat([10.3951, 63.4305]),
            zoom: this.compact ? 13 : 12,
          }),
        });

        this.map.on('click', this.onMapClick);
        this.updateMarkers();

        this.mapLoaded = true;
        this.mapError = false;
        this.cdr.detectChanges();

        // Set up theme change listener
        this.setupThemeListener();
      } catch (error) {
        console.error('[Map] Failed to initialize map:', error);
        this.mapLoaded = false;
        this.mapError = true;
        this.cdr.detectChanges();
      }
    }, 200);
  }

  private setupThemeListener(): void {
    // Create an observer that will listen for theme changes
    const checkTheme = () => {
      const isDark = this.themeService.isDark();
      const newTheme = isDark ? 'dark' : 'light';

      if (newTheme !== this.currentTheme && this.tileLayer) {
        this.currentTheme = newTheme;
        this.updateTileLayer();
      }
    };

    // Check theme periodically (every 500ms) - simpler than effects
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
    if (!this.tileLayer) return;

    const newSource = this.createTileSource(this.currentTheme);
    this.tileLayer.setSource(newSource);
  }

  focusAssignment(assignment: Assignment, options: FocusAssignmentOptions = {}): void {
    if (!this.map || !this.hasValidCoordinates(assignment)) {
      return;
    }

    const location = assignment.location as { lat: number; lon: number };
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

  private readonly onMapClick = (event: unknown) => {
    if (!this.map) return;
    if (!this.isMapClickEvent(event)) return;

    this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const assignment = feature.get('assignment') as Assignment | undefined;
      if (!assignment) {
        return false;
      }

      this.markerClicked.emit(assignment);
      return true;
    });
  };

  private updateMarkers() {
    this.markerSource.clear(true);

    if (!this.assignments.length) return;

    const markerFeatures = this.assignments
      .filter((assignment): assignment is Assignment & { location: { lat: number; lon: number } } =>
        this.hasValidCoordinates(assignment),
      )
      .map(
        (assignment) =>
          new Feature({
            geometry: new Point(fromLonLat([assignment.location.lon, assignment.location.lat])),
            assignment,
          }),
      );

    this.markerSource.addFeatures(markerFeatures);

    if (!this.map || markerFeatures.length === 0) return;

    const extent = this.markerSource.getExtent();
    if (!extent) return;

    const view = this.map.getView();
    view.fit(extent, {
      padding: [40, 40, 40, 40],
      maxZoom: this.compact ? 14 : 16,
      duration: 200,
    });
  }

  private hasValidCoordinates(assignment: Assignment): boolean {
    const lat = assignment.location?.lat;
    const lon = assignment.location?.lon;

    if (lat == null || lon == null) {
      return false;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return false;
    }

    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private isMapClickEvent(event: unknown): event is { pixel: Pixel } {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const maybePixel = (event as { pixel?: unknown }).pixel;
    return Array.isArray(maybePixel) && maybePixel.length === 2;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  ngOnDestroy() {
    // Clean up theme check interval
    if (this.themeCheckInterval) {
      clearInterval(this.themeCheckInterval);
    }

    if (this.map) {
      this.map.un('click', this.onMapClick);
      this.map.dispose();
    }
  }
}
