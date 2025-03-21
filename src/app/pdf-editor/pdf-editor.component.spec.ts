import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfEditorComponent } from './pdf-editor.component';

describe('PdfEditorComponent', () => {
  let component: PdfEditorComponent;
  let fixture: ComponentFixture<PdfEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PdfEditorComponent]
    });
    fixture = TestBed.createComponent(PdfEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
