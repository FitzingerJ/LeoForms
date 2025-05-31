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
  stepIndex = 0;
  currentUserEmail = '';
  canEdit = false;
  surveyId!: string;

  constructor(private route: ActivatedRoute,
              public oidc: OidcSecurityService,
              private cdr: ChangeDetectorRef,
              private dataService: DataService) {}

  ngOnInit(): void {
    this.surveyId = this.route.snapshot.params['id'];
    this.dataService.getAllSurveys().subscribe(surveys => {
      const selected = surveys.find(s => s.id?.toString() === this.surveyId);
      if (!selected) return;

      this.surveyName = selected.name || 'Unbenannte Umfrage';
      this.formHtml = localStorage.getItem('formHtml-' + this.surveyId) || '';
      this.workflow = JSON.parse(localStorage.getItem('workflow-' + this.surveyId) || '[]');
      this.stepIndex = Number(localStorage.getItem('step-' + this.surveyId) || '0');

      // 🧩 Jetzt DOM setzen
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

      // 🔄 Benutzer-Check
      this.oidc.userData$.subscribe(userData => {
        this.currentUserEmail = userData.email;

        const currentStep = this.workflow[this.stepIndex];
        let assignedEmail = currentStep?.assignedTo?.email;
        if (!assignedEmail && currentStep?.assignedTo?.name) {
          assignedEmail = this.dataService.getEmailForRole(currentStep.assignedTo.name);
        }

        this.canEdit = assignedEmail === this.currentUserEmail;
        this.cdr.detectChanges();
      });
    });
  }

  confirm(): void {
    // Schritt abschließen: zum nächsten übergehen
    if (this.stepIndex + 1 < this.workflow.length) {
      this.stepIndex++;
      localStorage.setItem('step-' + this.surveyId, this.stepIndex.toString());
    } else {
      // Ende erreicht: zu Answers-Seite oder abgeschlossen markieren
      localStorage.setItem('step-' + this.surveyId, 'done');
    }

    // Zurück zur Übersicht oder direkt aktualisieren
    window.location.href = '/survey_inv';
  }

  reject(): void {
    // Ablehnen → zurück zum Ersteller (Index 0)
    this.stepIndex = 0;
    localStorage.setItem('step-' + this.surveyId, '0');

    // 🟥 Markiere als abgelehnt
    localStorage.setItem('rejected-' + this.surveyId, 'true');

    window.location.href = '/survey_inv';
  }

  get currentStepLabel(): string {
    return this.workflow[this.stepIndex]?.label || '';
  }

  get totalSteps(): number {
    return this.workflow.length;
  }
}