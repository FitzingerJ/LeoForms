import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyViewerComponent } from './survey-viewer.component';

describe('SurveyViewerComponent', () => {
  let component: SurveyViewerComponent;
  let fixture: ComponentFixture<SurveyViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SurveyViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SurveyViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
