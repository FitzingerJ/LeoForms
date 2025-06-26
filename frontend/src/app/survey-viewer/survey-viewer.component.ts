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
  branchUserCount = 0;
  branchUserIndex = 0;
  currentStep: any;

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
      const raw = localStorage.getItem('workflow-' + this.surveyId) || '[]';
      const unsorted = JSON.parse(raw);
      this.workflow = this.sortWorkflow(unsorted);

      const savedIndex = Number(localStorage.getItem('step-' + this.surveyId) || '0');
      const startIndex = this.getFirstRealStepIndex();
      this.stepIndex = this.isSystemStep(this.workflow[savedIndex]) ? startIndex : savedIndex;
      this.currentStep = this.workflow[this.stepIndex];
      localStorage.setItem('step-' + this.surveyId, this.stepIndex.toString());

      const wasRejected = localStorage.getItem('rejected-' + this.surveyId) === 'true';

      // DOM Rendering
      setTimeout(() => this.renderDom(), 0);

      this.oidc.userData$.subscribe(userData => {
        this.currentUserEmail = userData.email;
        const step = this.workflow[this.stepIndex];

        if (this.isBranchStep(step)) {
          const assigned = step.assignedTo.map((a: any) => a.email || this.dataService.getEmailForRole(a.name));
          this.branchUserCount = assigned.length;
          this.branchUserIndex = assigned.findIndex((email: string) => email === this.currentUserEmail);

          const status = this.getStepStatus(step.id);
          const alreadyDone = status?.[step.id]?.done || [];
          this.canEdit = assigned.includes(this.currentUserEmail) && !alreadyDone.includes(this.currentUserEmail) && !wasRejected;
        } else {
          let assignedEmail = step?.assignedTo?.email;
          if (!assignedEmail && step?.assignedTo?.name) {
            assignedEmail = this.dataService.getEmailForRole(step.assignedTo.name);
          }
          this.canEdit = assignedEmail === this.currentUserEmail && !wasRejected;
        }

        this.cdr.detectChanges();
      });
    });
  }

  public isDoneStep(): boolean {
    const raw = localStorage.getItem('step-' + this.surveyId);
    if (raw === 'done') return true;

    const index = parseInt(raw || '0', 10);
    return this.workflow[index]?.label === 'Ende';
  }

  confirm(): void {
    const step = this.workflow[this.stepIndex];
    const stepId = step.id;

    if (this.isBranchStep(step)) {
      const all = step.assignedTo.map((a: any) => a.email || this.dataService.getEmailForRole(a.name));
      const key = `branchStatus-${this.surveyId}`;
      const allStatuses = this.getStepStatus(stepId);
      const currentStatus = allStatuses[stepId] || { done: [], rejected: false };

      if (!currentStatus.done.includes(this.currentUserEmail)) {
        currentStatus.done.push(this.currentUserEmail);
      }

      allStatuses[stepId] = currentStatus;
      localStorage.setItem(key, JSON.stringify(allStatuses));

      const allConfirmed = all.every((email: string) => currentStatus.done.includes(email));
      if (!allConfirmed) {
        window.location.href = '/survey_inv';
        return;
      }
    }

    // Weiter zum nächsten echten Schritt
    const next = this.getNextRealStepIndex(this.stepIndex);
    if (next !== -1) {
      this.stepIndex = next;
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

    const currentStep = this.workflow[this.stepIndex];
    const stepId = currentStep?.id;
    const isBranch = this.isBranchStep(currentStep);

    if (isBranch) {
      const status = this.getStepStatus(stepId);
      status.rejected = true;
      status.reason = reason;
      this.setStepStatus(stepId, status);
    }

    localStorage.setItem('rejectionReason-' + this.surveyId, reason);
    localStorage.setItem('rejected-' + this.surveyId, 'true');
    localStorage.setItem('step-' + this.surveyId, '0');

    window.location.href = '/survey_inv';
  }

  get currentStepLabel(): string {
    return this.currentStep?.label || '';
  }

  get totalSteps(): number {
    return this.visibleSteps.length;
  }

  isRejected(): boolean {
    return localStorage.getItem('rejected-' + this.surveyId) === 'true';
  }

  getRejectionReason(): string {
    const defaultReason = localStorage.getItem('rejectionReason-' + this.surveyId) || '';
    const step = this.workflow[this.stepIndex];
    if (this.isBranchStep(step)) {
      const branchStatus = this.getStepStatus(step?.id);
      return branchStatus?.reason || defaultReason;
    }
    return defaultReason;
  }

  private getStepStatus(stepId: string): any {
    const key = `branchStatus-${this.surveyId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  private setStepStatus(stepId: string, partialUpdate: any): void {
    const key = `branchStatus-${this.surveyId}`;
    const fullStatus = this.getStepStatus(stepId);

    // Bestehenden Zustand für diesen Schritt holen oder leeren initialisieren
    const current = fullStatus[stepId] || {};

    // Zusammenführen (merge) von bestehendem und neuem Status
    fullStatus[stepId] = {
      ...current,
      ...partialUpdate
    };

    localStorage.setItem(key, JSON.stringify(fullStatus));
  }

  public isSystemStep(step: any): boolean {
    return step?.label === 'Start' || step?.label === 'Ende';
  }

  public isBranchStep(step: any): boolean {
    return Array.isArray(step?.assignedTo);
  }

  private getFirstRealStepIndex(): number {
    return this.workflow.findIndex(s => !this.isSystemStep(s));
  }

  private getNextRealStepIndex(fromIndex: number): number {
    return this.workflow.findIndex((s, i) => i > fromIndex && !this.isSystemStep(s));
  }

  private renderDom(): void {
    const container = this.variableBindingRef?.nativeElement;
    if (!container || !this.formHtml) return;

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

  get currentBranchUserList(): string {
    if (!this.isBranchStep(this.currentStep)) return '';
    return this.currentStep.assignedTo
      .map((a: any) => a.name || a.email)
      .join(', ');
  }

  get progressText(): string {
    const visibleSteps = this.workflow.filter(s => !this.isSystemStep(s));
    const current = this.workflow[this.stepIndex];
    const index = visibleSteps.findIndex(s => s.id === current?.id);

    if (index === -1) return `Unbekannter Schritt: ${this.currentStepLabel}`;

    let base = `Schritt ${index + 1} / ${visibleSteps.length}: ${this.currentStepLabel}`;

    if (this.isBranchStep(current)) {
      const assigned = current.assignedTo || [];
      const status = this.getStepStatus(current.id);
      const done = (status?.[current.id]?.done || []) as string[];

      base += ` (${done.length} / ${assigned.length} bestätigt)`;
    }

    return base;
  }
}