import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Title } from '@angular/platform-browser';
import { SurveyModel } from '../model/survey.model';
import { Router } from "@angular/router";
import { MockOidcSecurityService as OidcSecurityService } from '../auth/mock-oidc.service';

@Component({
  selector: 'app-survey-inventory',
  templateUrl: './survey-inventory.component.html',
  styleUrls: [ './survey-inventory.component.css' ]
})
export class SurveyInventoryComponent implements OnInit {

  allSurveys: SurveyModel[] = [];
  filteredSurveys: SurveyModel[] = [];
  showOnlyOpen = false;
  private currentEmail = '';

  constructor(
    public dataServ: DataService,
    private titleService: Title,
    private route: Router,
    public oidcSecurityService: OidcSecurityService
  ) {
    this.titleService.setTitle('SURVEY INVENTORY');
  }

  ngOnInit(): void {
    // 1) Auf Userwechsel reagieren
    this.oidcSecurityService.userData$.subscribe(userData => {
      this.currentEmail = userData?.email || '';
      this.loadRelevantSurveys();
    });

    // Fallback initial
    this.oidcSecurityService.checkAuth().subscribe(({ userData }) => {
      this.currentEmail = userData?.email || '';
      this.loadRelevantSurveys();
    });
  }

  private loadRelevantSurveys(): void {
    this.dataServ.getAllSurveys().subscribe(surveys => {
      // Nur relevante Surveys: Creator oder irgendwo im Workflow zugewiesen
      this.allSurveys = surveys.filter(s => this.isRelevantForUser(s, this.currentEmail));
      this.applyFilters();
    });
  }

  applyFilters(): void {
    if (!this.showOnlyOpen) {
      this.filteredSurveys = this.allSurveys.slice();
      return;
    }
    this.filteredSurveys = this.allSurveys.filter(s => this.isOpenForUser(s, this.currentEmail));
  }

  private isRelevantForUser(survey: SurveyModel, email: string): boolean {
    const creator = localStorage.getItem('creator-' + survey.id);
    if (creator === email) return true;

    const workflowJson = localStorage.getItem('workflow-' + survey.id);
    if (!workflowJson) return true; // Surveys ohne Workflow sind für alle sichtbar

    const workflow = this.sortWorkflow(JSON.parse(workflowJson));
    // Wenn der Benutzer irgendwann als assignedTo vorkommt → relevant
    return workflow.some((step: any) => {
      if (!step || this.isSystemStep(step)) return false;
      if (Array.isArray(step.assignedTo)) {
        // Array von Personen
        return step.assignedTo
          .map((a: any) => a.email || this.dataServ.getEmailForRole?.(a.name))
          .includes(email);
      } else {
        const assignedEmail = step?.assignedTo?.email
          || (step?.assignedTo?.name ? this.dataServ.getEmailForRole?.(step.assignedTo.name) : undefined);
        return assignedEmail === email;
      }
    });
  }

  /** "Offen für mich?" = Dieser User ist am aktuellen echten Schritt dran und hat noch nicht bestätigt,
   *   Survey ist weder rejected noch done.
   */
  private isOpenForUser(survey: SurveyModel, email: string): boolean {
    // Fertig oder abgelehnt → nicht offen
    const rejected = localStorage.getItem('rejected-' + survey.id) === 'true';
    const stepRaw = localStorage.getItem('step-' + survey.id);
    if (rejected || stepRaw === 'done') return false;

    const workflowJson = localStorage.getItem('workflow-' + survey.id);
    if (!workflowJson) {
      // Ohne Workflow: offen, wenn Creator nicht der aktuelle User ist (oder du willst’s anders)
      return true;
    }

    const fullWorkflow = this.sortWorkflow(JSON.parse(workflowJson));

    // aktuellen "realen" Schritt bestimmen (Skip Start/Ende/Rücksprung)
    let idx = Number(stepRaw || '0');
    let step = fullWorkflow[idx];
    if (!step) return false;

    if (this.isSystemStep(step) || this.isRuecksprungStep(step)) {
      const firstVisible = fullWorkflow.find(s => !this.isSystemStep(s) && !this.isRuecksprungStep(s));
      if (!firstVisible) return false;
      idx = fullWorkflow.findIndex(n => n.id === firstVisible.id);
      step = firstVisible;
    }

    // Branch-Status beachten
    if (Array.isArray(step.assignedTo)) {
      const assigned = step.assignedTo.map((a: any) => a.email || this.dataServ.getEmailForRole?.(a.name));
      if (!assigned.includes(email)) return false;

      const key = `branchStatus-${survey.id}`;
      const statusJson = localStorage.getItem(key);
      const status = statusJson ? JSON.parse(statusJson) : {};
      const done = (status?.[step.id]?.done || []) as string[];

      // Offen, wenn dieser User in assigned ist und noch nicht bestätigt hat
      return !done.includes(email);
    } else {
      const assignedEmail = step?.assignedTo?.email
        || (step?.assignedTo?.name ? this.dataServ.getEmailForRole?.(step.assignedTo.name) : undefined);
      return assignedEmail === email;
    }
  }

  private isSystemStep(step: any): boolean {
    return step?.label === 'Start' || step?.label === 'Ende';
  }

  private isRuecksprungStep(step: any): boolean {
    return step?.label?.startsWith('Rücksprung');
  }

  seeAnswers() {
    this.route.navigate(["/answers"]);
  }

  hasWorkflow(surveyId: number | undefined): boolean {
    if (surveyId == null) return false;
    return !!localStorage.getItem('workflow-' + surveyId);
  }

  openSurvey(survey: SurveyModel): void {
    this.route.navigate(['/survey', survey.id]);
  }

  getDisplayStatus(survey: SurveyModel): string {
    const workflowJson = localStorage.getItem('workflow-' + survey.id);
    if (!workflowJson) return survey.status || 'Offen';

    const rejected = localStorage.getItem('rejected-' + survey.id);
    const rejectionReason = localStorage.getItem('rejectionReason-' + survey.id);
    if (rejected === 'true') {
      return rejectionReason ? `❌ Abgelehnt: ${rejectionReason}` : '❌ Abgelehnt';
    }

    const stepRaw = localStorage.getItem('step-' + survey.id);
    if (stepRaw === 'done') return '✔️ Abgeschlossen';

    const fullWorkflow: any[] = this.sortWorkflow(JSON.parse(workflowJson));
    const visibleSteps = fullWorkflow.filter(
      (s: any) => !this.isSystemStep(s) && !this.isRuecksprungStep(s)
    );

    let stepIndex = Number(stepRaw || '0');
    let currentStep = fullWorkflow[stepIndex];

    if (this.isSystemStep(currentStep) || this.isRuecksprungStep(currentStep)) {
      const firstVisible = fullWorkflow.find(s => !this.isSystemStep(s) && !this.isRuecksprungStep(s));
      if (!firstVisible) return '—';
      stepIndex = fullWorkflow.findIndex(n => n.id === firstVisible.id);
      currentStep = firstVisible;
    }

    if (!currentStep) return '—';

    const currentLabel = currentStep.label || '—';
    const currentId = currentStep.id;

    const currentVisibleIndex = visibleSteps.findIndex(s => s.id === currentId);

    if (Array.isArray(currentStep.assignedTo)) {
      const assigned = currentStep.assignedTo;
      const key = `branchStatus-${survey.id}`;
      const statusJson = localStorage.getItem(key);
      const status = statusJson ? JSON.parse(statusJson) : {};
      const done = (status?.[currentId]?.done || []) as string[];
      return `🔀 ${currentLabel} (${done.length} / ${assigned.length} bestätigt)`;
    }

    if (currentVisibleIndex === -1) return `🟡 ${currentLabel}`;
    return `🟡 Schritt ${currentVisibleIndex + 1} / ${visibleSteps.length}: ${currentLabel}`;
  }

  private sortWorkflow(workflow: any[]): any[] {
    const map = new Map<string, any>();
    const visited = new Set<string>();
    const sorted: any[] = [];

    for (const step of workflow) map.set(step.id, step);

    const start = workflow.find(s => s.label === 'Start');
    if (!start) return workflow;

    const dfs = (node: any) => {
      if (!node || visited.has(node.id)) return;
      visited.add(node.id);
      sorted.push(node);

      const nextIds = Array.isArray(node.next) ? node.next : [node.next];
      for (const nextId of nextIds) {
        const nextStep = map.get(nextId);
        dfs(nextStep);
      }
    };

    dfs(start);
    return sorted;
  }
}