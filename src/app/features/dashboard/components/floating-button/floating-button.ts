import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-button',
  imports: [CommonModule],
  templateUrl: './floating-button.html',
  styleUrl: './floating-button.css',
})
export class FloatingButton {
  @Input() isListView = true;
  @Output() viewChange = new EventEmitter<boolean>();

  toggle() {
    this.isListView = !this.isListView;
    this.viewChange.emit(this.isListView);
  }
}
