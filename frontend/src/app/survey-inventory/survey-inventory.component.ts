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
          const assignedTo = workflow[stepIndex]?.assignedTo?.email;
          const creator = localStorage.getItem('creator-' + s.id);

          return creator === email || assignedTo === email;
        });
      });
    });
    console.log(this.allSurveys);
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
    if (rejected === 'true') return '❌ Abgelehnt';

    const step = localStorage.getItem('step-' + survey.id);
    if (step === 'done') return '✔️ Abgeschlossen';

    const workflow = JSON.parse(workflowJson);
    const index = Number(step || 0);
    const label = workflow[index]?.label || '—';
    return `🟡 Schritt ${index + 1} / ${workflow.length}: ${label}`;
  }

}
