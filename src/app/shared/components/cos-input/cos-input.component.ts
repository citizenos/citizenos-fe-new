import { Component, ElementRef,  Input } from '@angular/core';

@Component({
  selector: 'cos-input',
  templateUrl: './cos-input.component.html',
  styleUrls: ['./cos-input.component.scss']
})
export class CosInputComponent {
  @Input() placeholder?: string;
  @Input() limit?: string;
  placeholderElement?: HTMLElement;
  limitElement?: HTMLElement;
  constructor (private readonly elementRef: ElementRef) {}

  ngAfterContentChecked() {
    const input = this.elementRef.nativeElement.querySelector('input, .dropdown, textarea');
    this.placeholderElement = this.elementRef.nativeElement.querySelector('.cos_input_placeholder');
    this.limitElement = this.elementRef.nativeElement.querySelector('.cos_limit_placeholder');
    input.classList.add('with_value');
    this.placeholderElement?.classList.add('show');
    this.limitElement?.classList.add('show');

    if (!input.value?.length && !input.classList.contains('dropdown')) {
      input.classList.remove('with_value');
      this.placeholderElement?.classList.remove('show');
    }
  }
}
