import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentCourseComponent } from './document-course.component';

describe('DocumentCourseComponent', () => {
  let component: DocumentCourseComponent;
  let fixture: ComponentFixture<DocumentCourseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentCourseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentCourseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
