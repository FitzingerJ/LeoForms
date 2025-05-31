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
          const workflowJson = localStorage.getItem('workflow-' + s.name);
          const stepIndex = Number(localStorage.getItem('step-' + s.name) || '0');

          // 🔓 Wenn kein Workflow definiert → immer anzeigen
          if (!workflowJson) return true;

          const workflow = JSON.parse(workflowJson);
          const assignedTo = workflow[stepIndex]?.assignedTo?.email;
          const creator = localStorage.getItem('creator-' + s.name);

          return creator === email || assignedTo === email;
        });
      });
    });
    console.log(this.allSurveys);
  }

  seeAnswers() {
    this.route.navigate(["/answers"]);
  }

  hasWorkflow(surveyName: string | undefined): boolean {
    if (!surveyName) return false;
    return !!localStorage.getItem('workflow-' + surveyName);
  }

  openSurvey(survey: SurveyModel): void {
    this.route.navigate(['/survey', survey.name]);
  }

  getDisplayStatus(survey: SurveyModel): string {
    const workflowJson = localStorage.getItem('workflow-' + survey.name);
    if (!workflowJson) return survey.status || 'Offen';

    const rejected = localStorage.getItem('rejected-' + survey.name);
    if (rejected === 'true') return '❌ Abgelehnt';

    const step = localStorage.getItem('step-' + survey.name);
    if (step === 'done') return '✔️ Abgeschlossen';

    const workflow = JSON.parse(workflowJson);
    const index = Number(step || 0);
    const label = workflow[index]?.label || '—';
    return `🟡 Schritt ${index + 1} / ${workflow.length}: ${label}`;
  }

}
