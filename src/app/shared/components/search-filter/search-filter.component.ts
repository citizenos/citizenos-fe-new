import { Component, Input } from '@angular/core';

@Component({
  selector: 'search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.scss'],
})

export class SearchFilterComponent {
  @Input() term!: string;
  @Input() placeholder!: string;
  @Input() search!: (event: string | null) => void;
  @Input() close!: () => void;
}
