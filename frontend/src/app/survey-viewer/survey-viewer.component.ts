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
import { DataService } from '../data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-survey-viewer',
  templateUrl: './survey-viewer.component.html',
  styleUrls: ['./survey-viewer.component.css']
})
export class SurveyViewerComponent implements OnInit {

  @ViewChild('variableBinding') variableBindingRef!: ElementRef;

  surveyName = '';
  formHtml = '';
  workflow: any[] = [];
  visibleSteps: any[] = [];
  stepIndex = 0;
  visibleStepIndex = 0;
  currentUserEmail = '';
  canEdit = false;
  surveyId!: string;

  constructor(private route: ActivatedRoute,
              public oidc: OidcSecurityService,
              private cdr: ChangeDetectorRef,
              private dataService: DataService,
              private router: Router) {}

  ngOnInit(): void {
    this.surveyId = this.route.snapshot.params['id'];
    this.dataService.getAllSurveys().subscribe(surveys => {
      const selected = surveys.find(s => s.id?.toString() === this.surveyId);
      if (!selected) return;

      this.surveyName = selected.name || 'Unbenannte Umfrage';
      this.formHtml = localStorage.getItem('formHtml-' + this.surveyId) || '';
      this.workflow = JSON.parse(localStorage.getItem('workflow-' + this.surveyId) || '[]');
      this.stepIndex = Number(localStorage.getItem('step-' + this.surveyId) || '0');
      this.visibleSteps = this.workflow.filter(n => n.label !== 'Start' && n.label !== 'Ende');

      const currentStep = this.workflow[this.stepIndex];

      // Wenn der aktuelle Schritt ein Start/Ende ist → such den nächsten sichtbaren
      const isVisible = this.visibleSteps.some(s => s.id === currentStep?.id);
      if (!isVisible) {
        const firstVisibleIndex = this.workflow.findIndex(n => this.visibleSteps.some(v => v.id === n.id));
        if (firstVisibleIndex !== -1) {
          this.stepIndex = firstVisibleIndex;
          localStorage.setItem('step-' + this.surveyId, this.stepIndex.toString());
        }
      }

      const stepId = this.workflow[this.stepIndex]?.id;
      const visibleIndex = this.visibleSteps.findIndex(s => s.id === stepId);
      this.visibleStepIndex = visibleIndex >= 0 ? visibleIndex : 0;
      const wasRejected = localStorage.getItem('rejected-' + this.surveyId) === 'true';

      // DOM setzen
      setTimeout(() => {
        const container = this.variableBindingRef?.nativeElement;
        if (container && this.formHtml) {
          container.innerHTML = this.formHtml;

          container.querySelectorAll('input').forEach((input: HTMLInputElement) => {
            const val = input.getAttribute('value');
            if (val !== null) input.value = val;
          });

          container.querySelectorAll('select').forEach((select: HTMLSelectElement) => {
            const selected = select.querySelector('option[selected]') as HTMLOptionElement | null;
            if (selected) selected.selected = true;
          });
        }
      }, 0);

      this.oidc.userData$.subscribe(userData => {
        this.currentUserEmail = userData.email;

        const currentVisibleStep = this.visibleSteps[this.visibleStepIndex];
        let assignedEmail = currentVisibleStep?.assignedTo?.email;
        if (!assignedEmail && currentVisibleStep?.assignedTo?.name) {
          assignedEmail = this.dataService.getEmailForRole(currentVisibleStep.assignedTo.name);
        }

        this.canEdit = assignedEmail === this.currentUserEmail && !wasRejected;
        this.cdr.detectChanges();
      });
    });
  }

  confirm(): void {
    if (this.stepIndex + 1 < this.workflow.length) {
      this.stepIndex++;
      localStorage.setItem('step-' + this.surveyId, this.stepIndex.toString());
    } else {
      localStorage.setItem('step-' + this.surveyId, 'done');
    }

    window.location.href = '/survey_inv';
  }

  reject(): void {
    const reason = prompt('Bitte gib einen Grund für die Ablehnung ein:');
    if (reason === null || reason.trim() === '') {
      alert('Du musst einen Ablehnungsgrund angeben.');
      return;
    }

    localStorage.setItem('rejectionReason-' + this.surveyId, reason);
    this.stepIndex = 0;
    localStorage.setItem('step-' + this.surveyId, '0');
    localStorage.setItem('rejected-' + this.surveyId, 'true');

    window.location.href = '/survey_inv';
  }

  get currentStepLabel(): string {
    if (this.visibleStepIndex === -1) {
      return this.workflow[this.stepIndex]?.label || '';
    }
    return this.visibleSteps[this.visibleStepIndex]?.label || '';
  }

  get totalSteps(): number {
    return this.visibleSteps.length;
  }

  isRejected(): boolean {
    return localStorage.getItem('rejected-' + this.surveyId) === 'true';
  }

  getRejectionReason(): string {
    return localStorage.getItem('rejectionReason-' + this.surveyId) || '';
  }
}