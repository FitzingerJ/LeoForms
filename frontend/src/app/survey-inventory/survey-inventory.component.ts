import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Title } from '@angular/platform-browser';
import { SurveyModel } from '../model/survey.model';
import {Router} from "@angular/router";
import { MockOidcSecurityService as OidcSecurityService } from '../auth/mock-oidc.service';

@Component({
  selector: 'app-survey-inventory',
  templateUrl: './survey-inventory.component.html',
  styleUrls: [ './survey-inventory.component.css' ]
})
export class SurveyInventoryComponent implements OnInit {

  allSurveys: SurveyModel[] = [];

  constructor(public dataServ: DataService, private titleService: Title, private route: Router, public oidcSecurityService: OidcSecurityService ) {
    this.titleService.setTitle('SURVEY INVENTORY');
  }

  ngOnInit(): void {
    this.oidcSecurityService.checkAuth().subscribe(({ userData }) => {
      const email = userData.email;

      this.dataServ.getAllSurveys().subscribe(surveys => {
        this.allSurveys = surveys.filter(s => {
          const workflowJson = localStorage.getItem('workflow-' + s.id);
          const stepIndex = Number(localStorage.getItem('step-' + s.id) || '0');

          // 🔓 Wenn kein Workflow definiert → immer anzeigen
          if (!workflowJson) return true;

          const workflow = JSON.parse(workflowJson);
          const visibleSteps = workflow.filter((n: any) => n.label !== 'Start' && n.label !== 'Ende');
          const firstRealStep = visibleSteps[0];
          const assignedTo = Array.isArray(firstRealStep?.assignedTo)
            ? (firstRealStep.assignedTo.map((a: any) => a.email).includes(email))
            : (firstRealStep?.assignedTo?.email === email);
          const creator = localStorage.getItem('creator-' + s.id);

          return creator === email || assignedTo === email;
        });
      });
    });
    console.log(this.allSurveys);
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
      return rejectionReason
        ? `❌ Abgelehnt: ${rejectionReason}`
        : '❌ Abgelehnt';
    }

    const stepRaw = localStorage.getItem('step-' + survey.id);
    if (stepRaw === 'done') return '✔️ Abgeschlossen';

    const fullWorkflow: any[] = this.sortWorkflow(JSON.parse(workflowJson));
    const visibleSteps = fullWorkflow.filter(
      (s: any) => !this.isSystemStep(s) && !this.isRuecksprungStep(s)
    );

    let stepIndex = Number(stepRaw || '0');
    let currentStep = fullWorkflow[stepIndex];

    // Falls aktueller Schritt System- oder Rücksprung-Schritt ist → echten finden
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

    // Verzweigung
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
