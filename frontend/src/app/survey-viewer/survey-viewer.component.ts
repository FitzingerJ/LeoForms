import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockOidcSecurityService as OidcSecurityService } from '../auth/mock-oidc.service';

@Component({
  selector: 'app-survey-viewer',
  templateUrl: './survey-viewer.component.html',
  styleUrls: ['./survey-viewer.component.css']
})
export class SurveyViewerComponent implements OnInit, AfterViewInit {

  @ViewChild('variableBinding') variableBindingRef!: ElementRef;

  surveyName = '';
  formHtml = '';
  workflow: any[] = [];
  stepIndex = 0;
  currentUserEmail = '';
  canEdit = false;

  constructor(private route: ActivatedRoute,
              public oidc: OidcSecurityService,
              private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.surveyName = this.route.snapshot.params['name'];
    this.formHtml = localStorage.getItem('formHtml-' + this.surveyName) || '';

    this.workflow = JSON.parse(localStorage.getItem('workflow-' + this.surveyName) || '[]');
    this.stepIndex = Number(localStorage.getItem('step-' + this.surveyName) || '0');

    this.oidc.checkAuth().subscribe(({ userData }) => {
      this.currentUserEmail = userData.email;
      const currentStep = this.workflow[this.stepIndex];
      this.canEdit = currentStep?.assignedTo?.email === this.currentUserEmail;
    });
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();

    const container = this.variableBindingRef.nativeElement;
    container.innerHTML = this.formHtml;

    // 🧠 Werte setzen (z. B. Firefox zeigt sonst kein value an)
    container.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      const val = input.getAttribute('value');
      if (val !== null) input.value = val;
    });

    container.querySelectorAll('select').forEach((select: HTMLSelectElement) => {
      const selected = select.querySelector('option[selected]') as HTMLOptionElement | null;
      if (selected) selected.selected = true;
    });
  }

  confirm(): void {
    // optional: speichern
  }

  reject(): void {
    // optional: zurück zum Ersteller
  }
}