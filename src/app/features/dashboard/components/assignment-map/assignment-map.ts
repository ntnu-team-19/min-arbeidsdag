import {
  Component,
  AfterViewInit,
  OnDestroy,
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
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';

export interface Assignment {
  id: number;
  name: string;
  location: { lat: number; lon: number };
  description?: string;
}

@Component({
  selector: 'app-assignment-map',
  standalone: true,
  imports: [],
  templateUrl: './assignment-map.html',
  styleUrl: './assignment-map.css',
})
export class AssignmentMapComponent implements AfterViewInit, OnDestroy {
  @Input() assignments: Assignment[] = [];
  @Input() compact = false;
  @Output() markerClicked = new EventEmitter<Assignment>();

  private map?: Map;
  mapLoaded = false;
  mapError = false;
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit() {
    setTimeout(() => {
      try {
        const mapElement = document.getElementById('assignment-map');

        console.log('[Map] Map element found:', mapElement);
        console.log('[Map] Assignments:', this.assignments);

        if (!mapElement) {
          throw new Error('Map container element not found');
        }

        if (mapElement.offsetHeight === 0 || mapElement.offsetWidth === 0) {
          throw new Error(
            `Map container has invalid dimensions: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`
          );
        }

        this.map = new Map({
          target: mapElement,
          layers: [
            new TileLayer({
              source: new OSM(),
            }),
          ],
          view: new View({
            center: fromLonLat([10.7522, 59.9139]),
            zoom: this.compact ? 13 : 12,
          }),
        });

        this.addMarkers();

        this.mapLoaded = true;
        this.mapError = false;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('[Map] Failed to initialize map:', error);
        this.mapLoaded = false;
        this.mapError = true;
        this.cdr.detectChanges();
      }
    }, 200);
  }

  private addMarkers() {
    if (!this.map || !this.assignments.length) return;

    const vectorSource = new VectorSource();

    this.assignments.forEach((assignment) => {
      const feature = new Feature({
        geometry: new Point(
          fromLonLat([assignment.location.lon, assignment.location.lat])
        ),
        assignment,
      });

      vectorSource.addFeature(feature);
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    this.map.addLayer(vectorLayer);

    this.map.on('click', (event) => {
      this.map!.forEachFeatureAtPixel(event.pixel, (feature) => {
        const assignment = feature.get('assignment') as Assignment | undefined;
        if (assignment) {
          this.markerClicked.emit(assignment);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.dispose();
    }
  }
}