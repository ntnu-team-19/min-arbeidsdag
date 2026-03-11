import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './core/layout/navbar/navbar';
import { FloatingButton } from './features/dashboard/components/floating-button/floating-button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, FloatingButton],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('min-arbeidsdag');
  isListView = true;

  onViewChange(listView: boolean) {
    this.isListView = listView;
  }
}
