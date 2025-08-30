import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TemplateModel } from './model/template.model';
import { SurveyModel } from './model/survey.model';
import {AnswerModel} from "./model/answer.model";

export interface SurveyDTO {
  creationDate: string;
  endDate: string;
  templateId: number;
  name: string;
  description: string;
  html: string;
  groups: string[];
}

export interface ReducedNode {
  id: string;
  label: string;
  assignedTo?: {
    name: string;
    email?: string;
    groupId?: string;
  };
  next: string[];
}

export interface FormInterface {
  name: string;
  creationDate: string;
  markdown: string;
}

export interface GroupInterface {
  name: string;
  year: string;
  id: string;
}

export interface UserData {
  email_verified: boolean;
  family_name: string;
  given_name: string;
  name: string;
  preferred_username: string;
  sub: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  groups?: GroupInterface[];
  readonly forms: FormInterface[];

  constructor(private http: HttpClient) {
    this.forms = [];
  }

  private surveyDraft: any = null;

  setSurveyDraft(draft: any): void {
    this.surveyDraft = draft;
  }

  getSurveyDraft(): any {
    return this.surveyDraft;
  }

  clearSurveyDraft(): void {
    this.surveyDraft = null;
  }

  private currentWorkflow: ReducedNode[] = [];

  setWorkflow(workflow: ReducedNode[]): void {
    this.currentWorkflow = workflow;
  }

  getWorkflow(): ReducedNode[] {
    return this.currentWorkflow;
  }

  getAllTemplates(): Observable<TemplateModel[]> {
    console.log(this.http.get<TemplateModel[]>('http://localhost:8080/template/'));
    return this.http.get<TemplateModel[]>('http://localhost:8080/template/');
  }

  getAllSurveys(): Observable<SurveyModel[]> {
    console.log(this.http.get<SurveyModel[]>('http://localhost:8080/survey/'));
    return this.http.get<SurveyModel[]>('http://localhost:8080/survey/');
  }

  deleteTemplateById(id: any): Observable<null> {
    return this.http.delete<null>('http://localhost:8080/template/' + id + '/template-id');
  }

  getTemplateById(id: any): Observable<TemplateModel> {
    return this.http.get<TemplateModel>('http://localhost:8080/template/' + id);
  }

  getAllAnswers(): Observable<AnswerModel[]> {
    console.log(this.http.get<AnswerModel[]>('http://localhost:8080/answer'));
    return this.http.get<AnswerModel[]>('http://localhost:8080/answer');
  }

  saveMd(nameForm: string, markdownString: string, descForm: string, fieldNames: string[]) {

    let datenow = new Date().toISOString().substring(0, 10);
    console.log(datenow);

    const form = {
      name: nameForm,
      creationDate: datenow.toString(),
      markdown: markdownString,
      description: descForm,
      fieldNames: fieldNames
    };

    this.forms.push(form);

    this.http.post(`http://localhost:8080/template`, form).subscribe(value => {
        console.log(value);
      }
    );
  }

  getGroups(): Observable<GroupInterface[]> {
    return this.http.get<GroupInterface[]>(`http://localhost:8080/groups`);
  }

  saveSurvey(dto: SurveyDTO): Observable<number> {
    return this.http.post<number>('http://localhost:8080/survey', dto);
  }

  private readonly roleEmailMap: { [role: string]: string } = {
    'Direktor': 'direktor@htl-leonding.ac.at',
    'Sekretariat': 'sekretariat@htl-leonding.ac.at',

    // Schulleitung (Beispiele/Platzhalter-Mails)
    'AV Informatik/IT-Medientechnik': 'av.it@htl-leonding.ac.at',
    'AV Elektronik/Medizintechnik': 'av.el@htl-leonding.ac.at',
    'Werkstättenleiter': 'werkstaettenleiter@htl-leonding.ac.at',

    // KV-Beispiele
    'KV_Beispiel': 'kv.beispiel@htl-leonding.ac.at',
    // (Falls du echte Klassen-KVs später brauchst, hier ergänzen:)
    'KV_5AHITM': 'kv.5ahitm@htl-leonding.ac.at',
    'KV_5BHITM': 'kv.5bhitm@htl-leonding.ac.at',
    'KV_5CHITM': 'kv.5chitm@htl-leonding.ac.at',
    'KV_4AHITM': 'kv.4ahitm@htl-leonding.ac.at',
    'KV_4BHITM': 'kv.4bhitm@htl-leonding.ac.at',
    'KV_4CHITM': 'kv.4chitm@htl-leonding.ac.at',

    // Weitere Beispielrollen
    'Lehrer_Beispiel': 'lehrer.beispiel@htl-leonding.ac.at',
    'Schueler_Beispiel': 'schueler.beispiel@htl-leonding.ac.at'
  };

  public getEmailForRole(name?: string): string | undefined {
    return name ? this.roleEmailMap[name] : undefined;
  }

}
