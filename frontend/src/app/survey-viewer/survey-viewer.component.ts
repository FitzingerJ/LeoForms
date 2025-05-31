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
              private cdr: ChangeDetectorRef,
              private dataService: DataService) {}

  ngOnInit(): void {
    this.surveyName = this.route.snapshot.params['name'];
    this.formHtml = localStorage.getItem('formHtml-' + this.surveyName) || '';
    this.workflow = JSON.parse(localStorage.getItem('workflow-' + this.surveyName) || '[]');
    this.stepIndex = Number(localStorage.getItem('step-' + this.surveyName) || '0');

    // Automatisch auf Benutzerwechsel reagieren
    this.oidc.userData$.subscribe(userData => {
      this.currentUserEmail = userData.email;

      const currentStep = this.workflow[this.stepIndex];

      // Mapping, falls assignedTo.email fehlt
      let assignedEmail = currentStep?.assignedTo?.email;
      if (!assignedEmail && currentStep?.assignedTo?.name) {
        assignedEmail = this.dataService.getEmailForRole(currentStep.assignedTo.name);
      }

      this.canEdit = assignedEmail === this.currentUserEmail;
      this.cdr.detectChanges();
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
    // Schritt abschließen: zum nächsten übergehen
    if (this.stepIndex + 1 < this.workflow.length) {
      this.stepIndex++;
      localStorage.setItem('step-' + this.surveyName, this.stepIndex.toString());
    } else {
      // Ende erreicht: zu Answers-Seite oder abgeschlossen markieren
      localStorage.setItem('step-' + this.surveyName, 'done');
    }

    // Zurück zur Übersicht oder direkt aktualisieren
    window.location.href = '/survey_inv';
  }

  reject(): void {
    // Ablehnen → zurück zum Ersteller (Index 0)
    this.stepIndex = 0;
    localStorage.setItem('step-' + this.surveyName, '0');

    // 🟥 Markiere als abgelehnt
    localStorage.setItem('rejected-' + this.surveyName, 'true');

    window.location.href = '/survey_inv';
  }

  get currentStepLabel(): string {
    return this.workflow[this.stepIndex]?.label || '';
  }

  get totalSteps(): number {
    return this.workflow.length;
  }
}